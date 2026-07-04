# Workday Integration Monitor - System Architecture

This document details the architecture, request flows, authentication mechanisms, and AI workflows for the Workday Integration Monitoring System.

---

## 1. System Overview

The system acts as a middleware and dashboard monitoring Workday integration runs. It polls Workday's SOAP/REST service, registers run events in a local PostgreSQL database, triggers Gemini AI analysis on logs for runs that failed or completed with errors, and allows administrators to relaunch integration events with a Human-in-the-Loop approval dashboard.

---

## 2. Dynamic High-Level Flow Chart

```mermaid
graph TD
    subgraph Frontend (React + Vite + TS)
        Dashboard[Dashboard View] --> IntegrationList[Registered Integrations]
        Dashboard --> EventViewer[Workday Events Monitor]
        EventViewer --> AIRecommendations[AI Troubleshooting Panel]
        EventViewer -->|Human-in-the-Loop Trigger| LaunchBtn[Auto-Launch Button]
    end

    subgraph Backend (Express + Node.js + TS)
        API[Express Router] --> AuthManager[Workday OAuth 2.0 Manager]
        API --> PollService[Workday Poller Scheduler]
        API --> LaunchService[Workday Launch Service]
        API --> AIService[AI Remediation Service]

        PollService -->|Fetch Events| SOAPClient[Workday SOAP / REST Client]
        LaunchService -->|Launch Request| SOAPClient
        
        AIService -->|Log Analysis Request| Gemini[Gemini API Client]
    end

    subgraph Data Layer
        Prisma[Prisma Client] --> DB[(PostgreSQL)]
    end

    subgraph External
        Workday[Workday Tenant API]
    end

    SOAPClient -->|OAuth Creds + SOAP Payload| Workday
    AuthManager -->|Token Request| Workday
    PollService --> Prisma
    LaunchService --> Prisma
```

---

## 3. Workday API Service Integration Details

### 3.1. Authentication (OAuth 2.0 Refresh Flow)
To authenticate securely against Workday without exposing static user password policies:
- The system requests a bearer token using OAuth 2.0:
  ```http
  POST /oauth2/v1/token HTTP/1.1
  Host: <workday_tenant_endpoint>
  Content-Type: application/x-www-form-urlencoded

  grant_type=refresh_token&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&refresh_token=YOUR_REFRESH_TOKEN
  ```
- The backend caches the resulting `access_token` and automatically refreshes it prior to expiration.

---

### 3.2. Polling Run Events (`Get_Integration_Events`)
The backend schedules periodic background polling queries (10m, 30m, 1h, 1d intervals).

* **API Service**: Integrations Service (SOAP version v43.0 or operational tenant equivalent)
* **Payload Structure**:
  ```xml
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
     <soapenv:Header>
        <bsvc:Workday_Common_Header>
           <!-- Bearer OAuth Access Token -->
        </bsvc:Workday_Common_Header>
     </soapenv:Header>
     <soapenv:Body>
        <bsvc:Get_Integration_Events_Request>
           <bsvc:Request_Criteria>
              <bsvc:Transaction_Log_Criteria_Data>
                 <bsvc:Initiated_From_Date_Time>2026-07-03T12:30:00</bsvc:Initiated_From_Date_Time>
              </bsvc:Transaction_Log_Criteria_Data>
           </bsvc:Request_Criteria>
        </bsvc:Get_Integration_Events_Request>
     </soapenv:Body>
  </soapenv:Envelope>
  ```
* **Response Data Extraction**:
  - **Integration Name**: Parsed from XML element `<bsvc:Integration_System_Reference ...> -> <bsvc:Descriptor>`
  - **Event ID**: Extracted from `<bsvc:Background_Process_Instance_Reference ...> -> <bsvc:ID bsvc:type="Background_Process_Instance_ID">`
  - **Run By**: Extracted from `<bsvc:Account_Reference ...> -> <bsvc:Descriptor>`
  - **Initiated Time**: Parsed from `<bsvc:Initiated_Date_Time>`
  - **Completed Time**: Parsed from `<bsvc:Completed_Date_Time>`
  - **Status**: Checked against string properties in `<bsvc:Status>` (e.g. *Completed*, *Completed_With_Errors*, *Failed*).

---

### 3.3. Relaunch Triggering (`Launch_Integration`)
Provides the "Auto-Launch" capability when human administrators approve rerun events in the UI.

* **API Service**: Integrations Service (SOAP)
* **Payload Structure**:
  ```xml
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
     <soapenv:Header/>
     <soapenv:Body>
        <bsvc:Launch_Integration_Request>
           <bsvc:Integration_System_Reference>
              <bsvc:ID bsvc:type="Integration_System_ID">INTEGRATION_SYSTEM_ID_HERE</bsvc:ID>
           </bsvc:Integration_System_Reference>
        </bsvc:Launch_Integration_Request>
     </soapenv:Body>
  </soapenv:Envelope>
  ```
* **Response Data Extraction**:
  - Extracts the returned `<bsvc:Background_Process_Instance_Reference>` representing the newly launched Event ID.
  - Registers the run as `PENDING` or `RUNNING` in the database, matching it to the relaunch action log.

---

## 4. AI Troubleshooting Workflow (Gemini)

If a retrieved integration run's status is parsed as `Failed` or `Completed_With_Errors`:
1. The backend triggers a request to fetch details/logs of the specific integration event.
2. The logs are combined with Workday context (Integration Name, Event ID, parameters) into a detailed prompt structure.
3. The prompt is passed to the Gemini SDK:
   - **System Rules**: *"Analyze the Workday Integration log trace. Diagnose configuration, parsing, payload, or connection errors. Return detailed description of the failure and step-by-step markdown guidelines to correct the issue."*
4. The suggestions are stored in database and sent to React dashboard to render.
