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
NEXT_PUBLIC_API_URL=<your-nexusforge-api-base-or-project-gateway>
NEXT_PUBLIC_API_KEY=<your-api-key>
NEXT_PUBLIC_MODULE_PROJECT_ID=<project-id-for-logic-modules>
```

## Required Environment Variables

Copy `.env.example` to `.env.local` and set these values:

- `NEXT_PUBLIC_API_URL`: Required. Base URL for the Nexus Forge backend API. The app supports either the core API base (`https://.../api/v1`) or the project gateway form (`https://.../api/v1/p/<project-id>`).
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
