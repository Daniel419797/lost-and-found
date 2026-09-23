# Lost & Found Backend

Dedicated API for the campus Lost & Found application. It replaces the previous Nexus Forge table/module dependency with an application-owned backend.

## Stack

- Node.js 24
- Express 5 + TypeScript
- PostgreSQL
- Prisma 7
- JWT access tokens + rotating refresh sessions
- Zod validation
- Helmet, CORS and rate limiting
- S3-compatible object storage for item photos
- Vitest

## Responsibilities

The backend owns:

- registration, login, refresh sessions, profile updates and account deletion
- student/staff/admin authorization
- lost and found report CRUD and filtering
- match candidate scoring and match notifications
- claim submission and staff review
- atomic claim approval/rejection state transitions
- handover scheduling and completion
- notifications and read state
- audit events and operational metrics
- item-photo uploads

The client never supplies the authoritative user ID for protected writes. Ownership and role checks are enforced by the API.

## Local setup

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Create a PostgreSQL database and set both `DATABASE_URL` and `DIRECT_URL`.

3. Install dependencies:

```bash
npm install
```

4. Apply migrations:

```bash
npm run prisma:deploy
```

5. Start the API:

```bash
npm run dev
```

Health endpoints:

- `GET /health`
- `GET /ready`

API base:

- `/api/v1`

## First administrator

Public registration always creates a `student` account. Administrative roles are never granted from a browser request.

To bootstrap the first super administrator, set these server-only variables temporarily:

```env
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=<strong-password>
ADMIN_BOOTSTRAP_NAME=System Administrator
```

Then run:

```bash
npm run admin:bootstrap
```

The command creates the account if it does not exist, or promotes and resets the password of the configured account if it already exists. Remove the bootstrap password from the environment after the command succeeds.

A super admin can later change user roles through:

```http
PATCH /api/v1/admin/users/:id/role
```

## Image storage

Report-image uploads require S3-compatible storage. Cloudflare R2 is supported.

Set:

- `STORAGE_ENDPOINT`
- `STORAGE_REGION` (use `auto` for R2)
- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_PUBLIC_BASE_URL`

The API accepts JPEG, PNG and WebP images up to 5 MB.

## Render deployment

Use `backend` as the Render service root directory.

Build command:

```bash
npm install && npm run prisma:deploy && npm run build
```

Start command:

```bash
npm start
```

Recommended production values:

```env
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
TRUST_PROXY=true
CORS_ORIGIN=https://your-frontend-domain.example
```

Generate `JWT_SECRET` with at least 64 random characters. Do not commit secrets.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
