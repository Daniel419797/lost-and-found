# Campus Lost & Found

Full-stack campus lost-and-found application with a dedicated application backend.

## Architecture

### Frontend

- Next.js 16.2.6 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui
- react-hook-form + Zod
- Axios

### Backend

- Node.js 24
- Express 5 + TypeScript
- PostgreSQL + Prisma 7
- JWT access tokens with rotating refresh sessions
- Role-based authorization
- S3-compatible image storage
- Audit logging and operational metrics

The application no longer depends on Nexus Forge tables, project gateways, API keys or logic modules.

## Features

- Student registration and login
- Profile and password management
- Lost-item reports
- Found-item reports and custody locations
- Server-side filtering and ownership enforcement
- Match scoring across lost and found reports
- Match notifications
- Ownership claims
- Staff/admin review workflow
- Handover scheduling and completion
- In-app notifications
- Admin audit logs and metrics
- R2/S3-compatible image uploads

## Frontend setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Frontend environment:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

For production, set `NEXT_PUBLIC_API_URL` to the deployed backend API URL.

## Backend setup

See [backend/README.md](backend/README.md).

From the backend directory:

```bash
npm install
cp .env.example .env
npm run prisma:deploy
npm run dev
```

## Quality gates

Frontend:

```bash
npm run lint
npm run typecheck
npm run build
```

Backend:

```bash
cd backend
npm run typecheck
npm test
npm run build
```

## Security model

- Public registration cannot self-assign staff/admin roles.
- Protected writes derive the user identity from the verified access token.
- Ownership and staff/admin permissions are enforced by the API.
- Passwords use bcrypt with a 12-round work factor.
- Refresh tokens are random, hashed in the database, rotated, revocable, and stored in an HttpOnly cookie.
- API traffic is protected with Helmet, CORS restrictions, request-size limits and rate limiting.
- Administrative and security-sensitive actions are written to the audit log.
