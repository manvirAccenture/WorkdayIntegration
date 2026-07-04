# Project Scope & Objectives

This document summarizes the core functional goals and user specifications for the Workday Integration Monitoring & AI Troubleshooting System.

---

## 1. Key Objectives

1. **Workday Connection & Authentication**:
   - Securely connect to the Workday tenant using OAuth 2.0 credentials: **Client ID, Client Secret, and Refresh Token**.
   - Authenticate API requests to fetch integration statuses and launch jobs.

2. **Integration Status Polling (Scheduler)**:
   - Polling engine that fetches integration execution events from Workday at selected intervals (e.g., 10 minutes, 30 minutes, 1 hour, 1 day).
   - Retrieve and display essential metrics:
     - **Integration Name**
     - **Event ID**
     - **Run By (Account)**
     - **Initiated Date & Time**
     - **Completed Date & Time**
     - **Status** (e.g., *Completed*, *Completed_With_Errors*, *Failed*)

3. **AI Error Remediation (Gemini)**:
   - When an integration has a status of `Failed` or `Completed_With_Errors`, intercept the event's transaction log/logs.
   - Run logs through the Gemini AI API to extract root causes, explain the failure, and offer actionable markdown troubleshooting steps.

4. **Auto-Launch & Human-in-the-Loop Recovery**:
   - Auto-launch trigger to programmatically retry a failed integration.
   - Human-in-the-Loop feature allowing users to approve retry launches or manually click "Auto-Launch" directly from the dashboard.
   - Trigger runs in Workday by wrapping inputs into a Workday API launch request.

5. **Monitoring Dashboard**:
   - Modern, premium React user interface showing active Workday integrations, execution logs, run histories, and AI troubleshooting cards.
