# Contributing to the Integration Monitoring & Auto-Relaunch System

Thank you for your interest in contributing to this project! This document outlines the guidelines, workflow, and best practices for developing and contributing to our repository.

---

## 1. Code of Conduct

Please maintain professional, respectful, and constructive communication at all times.

---

## 2. Setting Up Your Development Environment

Please follow the detailed instructions in the **[Setup & Installation Guide](file:///c:/Users/manvir.b.singh/ProjectAccenture/docs/Setup.md)** to configure your local environments:
- Register your API Client in Workday.
- Connect your Neon serverless cloud PostgreSQL database.
- Configure your `.env` variables.
- Run database migrations and launch the dev servers.

---

## 3. Git Branching Strategy

We follow a feature-branch workflow. When creating new contributions, please adhere to these branch naming conventions:

- **Feature branches**: `feature/feature-name` (e.g., `feature/ai-analysis-gemini`)
- **Bug fixes**: `bugfix/issue-description` (e.g., `bugfix/workday-relaunch-timeout`)
- **Documentation**: `docs/topic-name` (e.g., `docs/api-updates`)
- **Hotfixes**: `hotfix/issue-description`

### Git Setup Instructions
Before you begin, make sure Git is configured on your system:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 4. Commit Message Guidelines

We enforce the **Conventional Commits** standard to keep the project history clear and automated:

`type(scope): description`

### Types:
- `feat`: A new feature for the user
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semi-colons, etc. (no production code changes)
- `refactor`: Refactoring production code (e.g. renaming variables)
- `test`: Adding missing tests, refactoring tests
- `chore`: Updating build tasks, package manager configs, etc.

### Examples:
- `feat(backend): add route to relaunch dynamic workday integrations`
- `fix(prisma): correct database connection timeout for serverless neon client`
- `docs(api): update response schema for run status checklist`

---

## 5. Development Workflow

1. **Pull the Latest Changes**: Always ensure you start your work from the latest version of the `main` branch.
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create a Local Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Write Code**: Implement your features or bug fixes. Ensure you follow standard TypeScript practices and avoid linting errors.
4. **Local Verification**:
   - Run linter: `npm run lint` (once configured)
   - Ensure typescript compiles: `npx tsc --noEmit` in the backend
   - Verify Prisma schema is in sync: `npx prisma validate`
5. **Commit Your Changes**: Keep your commits small and focused.
   ```bash
   git add .
   git commit -m "feat(module): descriptive commit message"
   ```
6. **Push to Remote**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Submit a Pull Request (PR)**: Open a PR on GitHub/GitLab against the `main` branch. Provide a clear description of your changes and reference any issues resolved.

---

## 6. Code Style & Coding Standards

- **Language**: TypeScript (both frontend and backend). Avoid using `any` type whenever possible.
- **Formatting**: We use Prettier for code formatting. Ensure your editor formats on save or run Prettier manually before committing.
- **Database Rules**: All database schema changes must be driven through Prisma migrations (`npx prisma migrate dev`). Do not manually alter tables in PostgreSQL directly.
