# Technical Implementation Plan: Workday Integration Monitor

This document outlines the technical steps to configure, build, and deploy the Workday Integration Monitoring and AI-assisted troubleshooting application.

---

## 1. Core Technology Stack
- **Frontend**: React + Vite + TypeScript, Vanilla CSS (Premium dark design system)
- **Backend**: Node.js + Express + TypeScript, Prisma ORM
- **Database**: PostgreSQL (Neon Serverless Cloud DB) for system configuration
- **APIs**: Workday SOAP Integrations Service (v47.0), Gemini API SDK
- **Authentication**: Workday OAuth 2.0 Bearer Refresh Token flow

---

## 2. Workday Integration Workflows

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
