# Setup & Installation Guide

This document describes how to configure your Workday client API application, set up your local development environment, run PostgreSQL using Docker, and launch the backend and frontend modules.

---

## 1. Workday API Prerequisites

Before configuring the codebase, register an API Client in your Workday Dpt3 tenant console:

1. **Register Client API App**:
   - Log in to your Workday Tenant.
   - Search for **Register Client API App** in the search bar.
   - Enter your client application name (e.g. *Integration Monitor*).
   - Select **Non-Interactive** client type (using Refresh Tokens) or web app.
   - Authorize scope permissions: **Integrations** (with access to `Get_Integration_Events` and `Launch_Integration`).
2. **Collect Keys**:
   - Copy the generated **Client ID** and **Client Secret**.
3. **Generate Refresh Token**:
   - Search for task **Manage Refresh Tokens** in Workday.
   - Generate a long-lived Refresh Token associated with your administrator/api-system user account.

---

## 2. System Requirements
- **Node.js**: Version 18.x or 20.x (LTS)
- **Neon Account**: A free account at [Neon.tech](https://neon.tech) (no local database installation or Docker required)
- **npm / npx**: For package management.

---

## 3. Database Setup (Neon Cloud PostgreSQL)
Since Docker is not available on your system, we will use **Neon**, a serverless cloud PostgreSQL database:

1. **Create Neon Database**:
   - Go to [Neon.tech](https://neon.tech) and sign up for a free account.
   - Click **Create Project**. Name it (e.g., `workday-monitor`).
   - Neon will automatically generate a PostgreSQL database for you.
2. **Retrieve Connection String**:
   - In the Neon Console Dashboard, locate the **Connection Details** panel.
   - Select **Prisma** or **PostgreSQL** connection string format.
   - Copy the string. It will look similar to this:
     ```text
     postgresql://neondb_owner:PASSWORD@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

---

## 4. Backend Setup
1. In the `backend/` directory, create `.env`:
```env
PORT=5000

# Connection String copied from your Neon Console
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Gemini API Configuration
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Workday Credentials (Default configuration, can be updated via UI config endpoints)
WORKDAY_TENANT_NAME="Dpt3"
WORKDAY_API_ENDPOINT="https://wd3-impl-services1.workday.com"
WORKDAY_CLIENT_ID="YOUR_CLIENT_ID"
WORKDAY_CLIENT_SECRET="YOUR_CLIENT_SECRET"
WORKDAY_REFRESH_TOKEN="YOUR_REFRESH_TOKEN"
```

2. Initialize and migrate Prisma schemas directly to your Neon cloud DB:
```bash
npx prisma migrate dev --name init
```

3. Launch development backend:
```bash
npm run dev
```

---

## 5. Frontend Setup
1. Navigate to the `frontend/` directory.
2. Initialize environment configs in `.env.local`:
```env
VITE_API_URL="http://localhost:5000/api"
```
3. Run Vite server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.
