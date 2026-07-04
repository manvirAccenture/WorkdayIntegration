# Technical Implementation Plan: Workday Integration Monitor

This document outlines the technical steps to configure, build, and deploy the Workday Integration Monitoring and AI-assisted troubleshooting application.

---

## 1. Core Technology Stack
- **Frontend**: React + Vite + TypeScript, Vanilla CSS (Premium design system)
- **Backend**: Node.js + Express + TypeScript, Prisma ORM
- **Database**: PostgreSQL (Neon Serverless Cloud DB)
- **APIs**: Workday SOAP Integrations Service (v43.0), Gemini API SDK
- **Authentication**: Workday OAuth 2.0 Bearer Refresh Token flow

---

## 2. Workday Integration Workflows

### 2.1. Poller Engine
The Node backend executes a cron-like poller based on registered integration settings (10m, 30m, 1h, 1d):
1. Exchanges the Workday `refresh_token` for a temporary `access_token`.
2. Construct a SOAP request wrapper for the `Get_Integration_Events` action.
3. Apply `Transaction_Log_Criteria_Data` to query events that started within the elapsed interval.
4. Process output results. Match entries against local database records. Insert new events as run records, and extract error logs if statuses are `Failed` or `Completed_With_Errors`.

### 2.2. AI Troubleshooter (Gemini)
When a run event fails:
1. Fetch execution logs of the failed event.
2. Anonymize/redact credentials dynamically.
3. Pass the logs to Gemini API, asking for root-cause description and a formatted Markdown solution.
4. Write results back to the database.

### 2.3. Relaunch (Human-in-the-Loop & Auto-Launch)
- **Human-in-the-Loop**: Users see a list of failed integration runs. Clicking **Auto-Launch** fires a backend request to Workday SOAP `Launch_Integration`.
- **Auto-Launch**: If `autoLaunch` parameter is toggled to `true` on the integration, the system triggers the relaunch SOAP request programmatically when a failure occurs (with dynamic backoffs).

---

## 3. Database Schema Models (Prisma)
Refer to the detailed fields in [docs/Database.md](file:///c:/Users/manvir.b.singh/ProjectAccenture/docs/Database.md). Below is the core model config:
```prisma
model WorkdayConfig {
  id           String   @id @default(uuid())
  tenantName   String
  clientId     String
  clientSecret String
  refreshToken String
  apiEndpoint  String
}

model Integration {
  id              String           @id @default(uuid())
  workdaySystemId String           @unique
  name            String
  isActive        Boolean          @default(true)
  autoLaunch      Boolean          @default(false)
  pollingInterval String           @default("10m")
  runs            IntegrationRun[]
}

model IntegrationRun {
  id            String      @id // Background Process Instance ID (Event ID from Workday)
  integrationId String
  status        String      // Completed, Completed_With_Errors, Failed
  runBy         String?
  startedAt     DateTime
  completedAt   DateTime?
  logs          String?
  errorMessage  String?
  aiAnalysis    AiAnalysis?
}
```

---

## 4. Execution Roadmaps

### Phase 1: Foundation Documentation (Current Phase - Ready for Setup)
- Complete specifications for Architecture, Database schemas, API endpoints, and Setup guidelines.

### Phase 2: Database Setup & Backend Construction
- Provision a free PostgreSQL instance on Neon.tech.
- Set up Express app structure. Install packages (`dotenv`, `@prisma/client`, `axios`, `express`, `ts-node`).
- Write SOAP client module: XML construction and parsing helper scripts.
- Integrate Gemini SDK client.
- Build event poller background schedulers.

### Phase 3: Frontend Construction
- Scaffold React + Vite application.
- Build clean layout using custom Vanilla CSS (dark/glassmorphic dashboards, charts, expandable details).
- Implement status view list and Event monitoring timelines.
- Add AI remediation display drawer.
- Implement relaunch trigger controls.
