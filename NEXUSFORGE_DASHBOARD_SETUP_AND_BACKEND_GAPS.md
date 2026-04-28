# Nexus Forge Dashboard Setup and Backend Gap Checklist

Date: 2026-04-21

## 1. Nexus Forge Dashboard Setup

Use this sequence in Nexus Forge for the lost-and-found project.

### 1.1 Create and connect project
- Create a new project for lost and found.
- Go to Project Settings -> Database.
- Add PostgreSQL connection string.
- Save and run migrations.

Expected platform tables after migration:
- users
- refresh_tokens
- audit_logs
- api_keys

### 1.2 Enable authentication mode
- Turn on Tenant-Owned Auth.
- Confirm auth endpoints are active under the project gateway path.

### 1.3 Configure project origins and access
- Add frontend origin to allowed origins.
- If using development, allow localhost origin used by your frontend.
- Generate and store a project API key if your UI will send x-api-key.

### 1.4 Create custom tables in Tables dashboard
Do not create users manually. Create only domain tables listed below:
- lost_reports
- found_reports
- claims
- handovers
- report_media
- match_candidates
- notifications

Then click Migrate for each table.

### 1.5 Configure frontend environment
Add to frontend env file:
- NEXT_PUBLIC_API_URL equals project gateway base, example: https://host/api/v1/p/project-id
- NEXT_PUBLIC_API_KEY equals project API key if required by your policy

### 1.6 Verify minimum connectivity
- Auth register and login work via project path.
- Create and list rows on at least one custom table.
- Confirm table route returns only allowed project data.

---

## 2. Table Definitions to Create in Nexus Forge

Use JSON files in this folder:
- table-json/lost_reports.json
- table-json/found_reports.json
- table-json/claims.json
- table-json/handovers.json
- table-json/report_media.json
- table-json/match_candidates.json
- table-json/notifications.json

Notes:
- Keep status columns as string enums enforced in application validation.
- Keep user linkage through user_id-like columns for row ownership checks.

---

## 3. What Is Currently Missing in Backend for Full Build

Current state:
- You have generic auth and generic table CRUD patterns from Nexus Forge style.
- You do not yet have lost-and-found domain modules and workflow logic implemented.

Missing backend capabilities for full product:

### 3.1 Domain API surface
- Lost reports endpoints aligned to contract
- Found reports endpoints aligned to contract
- Claims endpoints including review queue
- Handover endpoint with transactional closure
- Matching endpoints including recompute
- Notifications read and list endpoints
- Admin metrics and filtered audit endpoints

### 3.2 Domain services
- Similarity scoring service for candidate matching
- Workflow state machine service for claims and report states
- Transaction service for handover completion
- Notification dispatcher service with retry policy

### 3.3 Validation and authorization
- Request schema validation for all domain writes
- Role checks for admin-only operations
- Ownership checks for user-editable records
- Status transition guards to prevent invalid states

### 3.4 Data and indexing readiness
- Ensure required custom tables exist and migrated in tenant DB
- Add database indexes for query-heavy paths where Nexus supports custom indexing
- Backfill or recompute process for match_candidates

### 3.5 Observability and quality gates
- Structured audit log entries for all sensitive mutations
- Endpoint-level integration tests for workflow transitions
- Load tests for list, match retrieval, and review queue

---

## 4. Practical Build Strategy with Nexus Forge

Recommended approach:
1. Use Nexus table CRUD for baseline report and notification storage.
2. Add dedicated backend modules for business logic that cannot live safely in frontend:
   - claims decisioning
   - matching computation
   - handover transaction orchestration
3. Keep frontend service layer thin and map DTOs from snake_case to camelCase.

This matches what worked in mood-tracker while avoiding business-critical logic leakage to client.
