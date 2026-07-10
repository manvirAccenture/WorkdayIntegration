# Project Scope & Objectives

This document summarizes the core functional goals and user specifications for the Workday Integration Monitoring & AI Troubleshooting System.

---

## 1. Key Objectives

1. **Workday Connection & Authentication**:
   - Securely connect to the Workday tenant using OAuth 2.0 credentials: **Client ID, Client Secret, and Refresh Token**.
   - Authenticate API requests to fetch integration statuses and launch jobs.

2. **Integration Run Event Monitoring (Real-Time Custom RaaS)**:
   - Query a custom Workday Custom Report (RaaS) directly in real-time to list integration runs.
   - Support user-selected filter intervals on the dashboard (10 minutes, 1 hour, 5 hours, 1 day) to pull fresh data.
   - Display essential metrics fetched in real-time:
     - **Integration Name**
     - **Event ID**
     - **Run By (Account)**
     - **Actual Completed Date & Time**
     - **Errors & Warnings Count**
     - **Status** (e.g., *Completed*, *Completed_With_Errors*, *Failed*)

3. **AI Error Remediation (Gemini)**:
   - When an integration has a status of `Failed` or `Completed_With_Errors`, fetch the transaction logs.
   - Run logs through the Gemini AI API to extract root causes, explain the failure, and offer actionable markdown troubleshooting steps.

4. **Human-in-the-Loop Parameterized Relaunch**:
   - Provide a Relaunch button directly in the UI.
   - If an integration run fails, show a modal dialog box containing all launch parameters configured for that integration system.
   - Dynamically fallback to the integration system definition if the run event itself has no parameters.
   - Let the user review and edit the values before relaunching the integration via Workday SOAP `Launch_Integration_Event_Request`.

5. **Monitoring Dashboard**:
   - Modern, premium React user interface showing active Workday integrations, execution logs, run histories, and AI troubleshooting cards.
