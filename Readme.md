# Integration Monitoring & Auto-Relaunch System

Welcome to the Integration Monitoring & Auto-Relaunch System codebase.

This project monitors integration tasks, logs their execution runs, performs automated AI failure analysis when jobs crash, and programmatically relaunch tasks when failures occur.

---

## 🚀 Project Phases & Roadmaps

We are currently in **Phase 1: Architecture and Documentation Planning**.

1. **Phase 1: Architecture & Planning (Current)**
   - Draft comprehensive system designs, data models, API endpoints, and configuration plans.
   - User reviews documentation, resolves database preferences, and prepares local tools (Docker).
2. **Phase 2: Project Scaffold & Backend Setup**
   - Initialize package libraries and Node configurations.
   - Run local PostgreSQL via Docker Compose.
   - Establish database schemas via Prisma.
   - Implement Express routes, Runner services, and Gemini API controllers.
3. **Phase 3: Frontend Dashboard Development**
   - Build React + Vite app using TypeScript.
   - Create responsive panels for log tracking, run statuses, and AI recommendations.
   - Add auto-launch controllers and parameter customizers.
4. **Phase 4: Testing & Production Deployment**
   - Validate run execution behaviors, auto-retry delays, and error masking.

---

## 📂 Documentation Index

All core technical specifications are prepared in the `docs/` folder:

- **[System Architecture](file:///c:/Users/manvir.b.singh/ProjectAccenture/docs/Architecture.md)**: System design patterns, child-process runtime behaviors, and AI analysis flows.
- **[Database Models](file:///c:/Users/manvir.b.singh/ProjectAccenture/docs/Database.md)**: Entity models, dynamic parameters configurations JSON layouts, and Prisma schemas.
- **[API Specification](file:///c:/Users/manvir.b.singh/ProjectAccenture/docs/API.md)**: Express endpoints request schemas, responses schemas, and error structures.
- **[Setup & Installation Guide](file:///c:/Users/manvir.b.singh/ProjectAccenture/docs/Setup.md)**: Setup prerequisites, env settings, and Docker container run structures.
- **[Technical Implementation Plan](file:///c:/Users/manvir.b.singh/ProjectAccenture/Implementation.md)**: Roadmap options, database comparison matrix, and initial implementation details.
