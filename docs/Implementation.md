# Technical Implementation Plan: Workday Integration Monitor

This document outlines the technical steps to configure, build, and deploy the Workday Integration Monitoring and AI-assisted troubleshooting application.

---

## 1. Core Technology Stack
<<<<<<< HEAD
- **Frontend**: React + Vite + TypeScript, Vanilla CSS (Premium dark design system)
- **Backend**: Node.js + Express + TypeScript, Prisma ORM
- **Database**: PostgreSQL (Neon Serverless Cloud DB) for system configuration
- **APIs**: Workday SOAP Integrations Service (v47.0), Gemini API SDK
=======
- **Backend**: Node.js + Express + TypeScript
- **Database**: None (Real-time architecture; operates in-memory and queries Workday dynamically)
- **APIs**: Workday SOAP Integrations Service (v43.0), Workday Custom Reports (RaaS REST JSON), Gemini API SDK
>>>>>>> 657c2f90fcc2853221da3dd90a027b4af3fe4edd
- **Authentication**: Workday OAuth 2.0 Bearer Refresh Token flow

---

## 2. Workday Integration Workflows

<<<<<<< HEAD
### 2.1. Real-Time Event Report (Custom RaaS)
Instead of a database background poller, the application fetches the runs directly from Workday in real-time:
1. Exchanges the Workday `refresh_token` for a temporary `access_token`.
2. Calls the Workday Custom Report (RaaS) URL with a runtime filter interval (e.g. `10m`, `1h`, `5h`, `1d`) as a parameter.
3. Maps report output rows to the frontend dashboard run list in real-time.

### 2.2. AI Troubleshooter (Gemini)
When a run event details page loads for a failed/warning event:
1. Fetch execution logs of the failed event from Workday SOAP API.
2. Pass the log data along with system metadata to Gemini API.
3. Generate root-cause explanation and suggested fix in markdown.

### 2.3. Parameterized Relaunch
When a user clicks "Relaunch Integration":
1. **Dynamic Parameter Resolution**:
   - If the event SOAP response contains launch parameter data, it is loaded.
   - If empty, the backend calls `Get_Integration_Systems` for the system ID and parses `<wd:Custom_Launch_Parameter_Data>` as a fallback.
2. **Review Dialog**: The frontend displays a glassmorphic modal with input fields.
3. **SOAP Request Construction**:
   - Submits values to SOAP `Launch_Integration_Event_Request`.
   - Elements are mapped directly under the root element as `<bsvc:Integration_Launch_Parameter_Data>`.
   - Configured with `bsvc:parent_id`, `bsvc:parent_type="Integration_System_ID"`, `bsvc:type="Launch_Parameter_Name"`, and `<bsvc:Text>` typed values.

---

## 3. Database Schema Models (Prisma)
Prisma is used for tenant config and tracking applied fixes:
```prisma
model WorkdayConfig {
  id           String   @id @default(uuid())
  tenantName   String
  clientId     String
  clientSecret String
  refreshToken String
  apiEndpoint  String
}
```

---

## 4. Completed Milestones
- Real-time dashboard integrating Workday custom report.
- AI troubleshooter generating log-based remediation on-the-fly.
- End-to-end verified parameterized relaunch modal with system fallback parser.
=======
### 2.1. Poller Engine
The Node backend executes real-time queries based on user requests or intervals:
1. Exchanges the Workday `refresh_token` for a temporary `access_token`.
2. Fetches integration system definitions and run statuses dynamically using either SOAP or Custom Report JSON endpoints (RaaS).
3. Polls execution events within requested intervals (10m, 1h, 5h, 1d) on-demand.
4. Maps Workday SOAP/RaaS properties to the frontend dashboard schema in real-time.

### 2.2. AI Troubleshooter (Gemini)
When a run event fails:
1. Fetch execution logs of the failed event in real-time from Workday.
2. Anonymize/redact credentials dynamically.
3. Pass the logs to Gemini API, asking for root-cause description and a formatted Markdown solution.
4. Return diagnosis results directly to the frontend client.

### 2.3. Relaunch (Human-in-the-Loop & Parameter Dialog)
- **Human-in-the-Loop Relaunch**: Users can trigger a relaunch directly from the run details view.
  1. Clicking the **Relaunch** button displays a dialogue box.
  2. If the event has previous launch parameters or the system has default parameter definitions (fetched via `Get_Integration_Systems_Request`), they are presented in editable fields.
  3. The user modifies parameters as needed and submits.
  4. The backend sends a `Launch_Integration` SOAP request containing the launch parameters mapped directly inside the XML payload.
- **Relaunch API Endpoint**: Mounts a POST route `/api/runs/:runId/relaunch` accepting a `launchParams` array body: `[{ name: string, value: string }]`.

---

## 3. Real-Time & Database-less Architecture
To prevent data sync delays and minimize infrastructure overhead, the system operates completely database-less.
- **In-Memory Config**: The application manages active Workday credentials (endpoints, tenant, OAuth client keys) in-memory, loaded from backend `.env` variables or updated dynamically via `/api/workday/config`.
- **On-Demand Queries**: Workday integration definitions and event histories are queried directly from the Workday SOAP and RaaS REST endpoints on page load.
- **AI Diagnostics on the fly**: Root-cause analysis and suggested fixes are analyzed on-the-fly when a user opens a failed event's detail page, ensuring instant troubleshooting feedback.

---

## 4. Execution Roadmaps

### Phase 1: Foundation Documentation (Current Phase - Completed)
- Specifications for Architecture, API endpoints, Setup guidelines, and Relaunch mechanisms.

### Phase 2: Backend Construction (Completed)
- Set up Express app structure.
- Implement SOAP client modules for Get_Integration_Systems, Get_Integration_Events, and Launch_Integration.
- Implement RaaS REST consumer for real-time dashboard events.
- Integrate Gemini SDK client.

### Phase 3: Frontend Dashboard Development (Completed)
- Scaffold React + Vite application.
- Build dark/glassmorphic layouts with custom Vanilla CSS.
- Implement real-time status listings, detail panels, AI remediation drawer, and the relaunch parameters dialogue box.

>>>>>>> 657c2f90fcc2853221da3dd90a027b4af3fe4edd
