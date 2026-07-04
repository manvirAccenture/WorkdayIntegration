# Express REST API Specification

This document details the REST API endpoints available on the Express backend server of the Workday Integration Monitoring System.

---

## 1. Base URL
All API requests are relative to: `http://localhost:5000/api`

---

## 2. Endpoints

### 2.1. Workday Connection Configuration

#### GET `/workday/config`
Retrieve current Workday configuration status (excluding secrets/keys).
* **Response**: `200 OK`
  ```json
  {
    "id": "c983427f-94d1-419b-8bc6-df7218ef478c",
    "tenantName": "Dpt3",
    "apiEndpoint": "https://wd3-impl-services1.workday.com",
    "clientId": "client_id_configured",
    "hasClientSecret": true,
    "hasRefreshToken": true
  }
  ```

#### POST `/workday/config`
Save or update Workday connection credentials.
* **Body**:
  ```json
  {
    "tenantName": "Dpt3",
    "apiEndpoint": "https://wd3-impl-services1.workday.com",
    "clientId": "your_client_id_here",
    "clientSecret": "your_client_secret_here",
    "refreshToken": "your_refresh_token_here"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Workday configuration credentials successfully saved."
  }
  ```

---

### 2.2. Registered Integrations

#### GET `/integrations`
List Workday integrations registered in the monitoring system.
* **Response**: `200 OK`
  ```json
  [
    {
      "id": "e2934d01-43ba-47cf-940f-c743130f3cef",
      "workdaySystemId": "INT_SYS_REVENUE_SYNC",
      "name": "Sync Shopify Revenue Log",
      "description": "Daily synchronization of Shopify sales records into Workday GL",
      "category": "Finance",
      "isActive": true,
      "autoLaunch": true,
      "pollingInterval": "10m",
      "createdAt": "2026-07-03T12:00:00.000Z"
    }
  ]
  ```

#### POST `/integrations`
Register a Workday Integration System ID to start monitoring it.
* **Body**:
  ```json
  {
    "workdaySystemId": "INT_SYS_REVENUE_SYNC",
    "name": "Sync Shopify Revenue Log",
    "description": "Daily synchronization of Shopify sales records into Workday GL",
    "category": "Finance",
    "pollingInterval": "30m",
    "autoLaunch": false
  }
  ```
* **Response**: `201 Created`

#### PUT `/integrations/:id`
Modify configuration parameters (polling interval, auto-launch toggle, active state).
* **Response**: `200 OK`

---

### 2.3. Events & Run Tracking

#### GET `/runs`
Retrieve the collection of pulled run events, filtered by status, integration, or dates.
* **Params**:
  - `status`: optional (e.g. `Failed`, `Completed_With_Errors`, `Completed`)
  - `integrationId`: optional
* **Response**: `200 OK`
  ```json
  [
    {
      "id": "Event_20260703_9941a",
      "integrationId": "e2934d01-43ba-47cf-940f-c743130f3cef",
      "status": "Failed",
      "runBy": "wd_admin_sync",
      "startedAt": "2026-07-03T12:30:00.000Z",
      "completedAt": "2026-07-03T12:32:15.000Z",
      "errorMessage": "Workday Web Service Error: Schema validation failed."
    }
  ]
  ```

#### GET `/runs/:runId`
Retrieve full detailed execution log, trace, and AI analysis for a specific event.
* **Response**: `200 OK`
  ```json
  {
    "id": "Event_20260703_9941a",
    "integrationId": "e2934d01-43ba-47cf-940f-c743130f3cef",
    "status": "Failed",
    "runBy": "wd_admin_sync",
    "startedAt": "2026-07-03T12:30:00.000Z",
    "completedAt": "2026-07-03T12:32:15.000Z",
    "logs": "[DEBUG] Initiating SOAP Handshake...\n[ERROR] Request XML validation failed: element 'Account_Code' must have length >= 4.",
    "errorMessage": "Request XML validation failed: element 'Account_Code' must have length >= 4",
    "aiAnalysis": {
      "detectedRootCause": "Workday web service validation rejected the invoice line item due to a short account code string.",
      "suggestedFix": "### Troubleshooting Steps\n1. Locate record code line `324` in input mapping configuration.\n2. Pad value to satisfy field validation lengths (> 4 chars).\n3. Re-run integration.",
      "applied": false
    }
  }
  ```

---

### 2.4. Actions & Relaunches

#### POST `/runs/:runId/relaunch`
Manually trigger a Workday `Launch_Integration` request for the corresponding integration system (Human-in-the-Loop flow).
* **Response**: `202 Accepted`
  ```json
  {
    "success": true,
    "launchedEventId": "Event_20260703_abc77",
    "message": "Launch_Integration request successful. Scheduled new Workday process run."
  }
  ```

#### POST `/integrations/:id/poll-now`
Force backend scheduler to query `Get_Integration_Events` immediately.
* **Response**: `200 OK`
  ```json
  {
    "success": true,
    "pulledEventsCount": 3,
    "message": "Polled Workday events successfully."
  }
  ```
