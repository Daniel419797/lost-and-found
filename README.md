# Campus Lost and Found Web App

Production-ready Next.js frontend for a university lost-and-found system.

## Stack

- Next.js 16.2.6 (App Router, Turbopack)
- React 19.2.4 + TypeScript
- Tailwind CSS v4
- shadcn/ui v4 + @base-ui/react
- react-hook-form + zod
- Axios API client for Nexus Forge backend

## Key App Features

- Auth: login, register, profile update, password change, logout
- Reporting: create and list lost/found item reports
- Search: merged lost/found browse with filters
- Claims: student claim tracking and staff claim review workflow
- Notifications: in-app claim and handover updates with mark-read actions
- Admin: role-gated audit logs and operational metrics

## Run Locally

1. Install dependencies:

```powershell
npm install
```

2. Configure environment in `.env.local`:

```env
NEXT_PUBLIC_API_URL=<your-nexusforge-project-gateway>
NEXT_PUBLIC_API_KEY=<your-api-key>
NEXT_PUBLIC_MODULE_PROJECT_ID=<project-id-for-logic-modules>
```

## Required Environment Variables

Copy `.env.example` to `.env.local` and set these values:

- `NEXT_PUBLIC_API_URL`: Required. Base URL for the Nexus Forge backend API used by auth, table CRUD, and all frontend service calls.
- `NEXT_PUBLIC_API_KEY`: Required. Public API key sent with every request by the shared Axios client.
- `NEXT_PUBLIC_MODULE_PROJECT_ID`: Required for the lost-and-found workflow automations. Used when the frontend triggers the `claim-review` and `match-scoring` logic modules. If this is missing, standard CRUD still works, but those logic-module execute calls are skipped or must be passed an explicit project id by the caller.

3. Start development server:

```powershell
npm run dev
```

## Quality Gates

- Lint:

```powershell
npm run lint
```

- Type check:

```powershell
npm run typecheck
```

- Production build:

```powershell
npm run build
```

- Release verification shortcut:

```powershell
npm run verify
```

## CI Policy (Pull Requests)

PRs that touch this app are enforced by:

- `.github/workflows/lost-and-found-ci.yml`

Policy behavior:

- Runs `npm run verify` (lint + production build)
- Runs dependency audit policy (`npm audit --omit=dev --json`)
- Fails on any reported production dependency vulnerability

## Verified Status (2026-05-13)

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run build`: pass
- `npm audit --omit=dev`: pass, 0 vulnerabilities

## Security Notes

See `SECURITY_NOTES.md` for the current audit status and dependency policy.

## Planning and Design Artifacts

The following planning documents are preserved in this folder:

- `PRD_LostAndFoundCampus.md`
- `SRS_LostAndFoundCampus.md`
- `DATA_MODEL_AND_API_CONTRACT_LostAndFound.md`
- `IMPLEMENTATION_MILESTONES_TEST_STRATEGY_TIMELINE.md`
- `NEXUSFORGE_DASHBOARD_SETUP_AND_BACKEND_GAPS.md`
- `SPRINT_01_TASK_BOARD.md`
- `NO_CODE_MODULE_CAPABILITY_BLUEPRINT.md`
- `PHASE_2_TASK_BOARD_NO_CODE_MODULES.md`
- `PHASE_2_DEPENDENCY_DAG.md`
- `PHASE_2_CRITICAL_PATH.md`
- `PHASE_2_START_TOMORROW_SUBSET.md`
