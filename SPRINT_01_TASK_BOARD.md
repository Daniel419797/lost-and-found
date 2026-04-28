# Sprint 1 Task Board
## Sprint Window
2026-04-22 to 2026-05-07

## Sprint Goal
Deliver foundations plus first usable vertical slice: authentication, lost and found report intake, and searchable report history on Nexus Forge-backed storage.

## Board Columns
- Todo
- In Progress
- Review
- Done
- Blocked

---

## Epic S1-A: Foundation and Environment

### S1-001 Setup repository and CI baseline
- Type: Chore
- Priority: High
- Estimate: 3 points
- Owner: Backend and DevOps
- Dependencies: None
- Description: Configure lint, test, type-check, and CI workflow.
- Acceptance Criteria:
  - CI runs on push and pull request.
  - Lint and test commands pass in clean checkout.
  - Contribution guide includes run steps.

### S1-002 Bootstrap frontend app shell for lost-and-found
- Type: Task
- Priority: High
- Estimate: 3 points
- Owner: Frontend
- Dependencies: S1-001
- Description: Create route groups, shared layout, nav placeholders, auth guard wiring.
- Acceptance Criteria:
  - Public routes and protected routes are separated.
  - Protected route redirects unauthenticated users.
  - Layout renders consistently on desktop and mobile.

### S1-003 Configure Nexus Forge project connectivity
- Type: Task
- Priority: High
- Estimate: 2 points
- Owner: Full Stack
- Dependencies: None
- Description: Connect frontend to Nexus Forge project URL and API key conventions.
- Acceptance Criteria:
  - Environment variables documented and loaded.
  - API client sends token and optional x-api-key.
  - Health and one protected call succeed.

---

## Epic S1-B: Auth and Roles Baseline

### S1-004 Implement auth service integration
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Frontend
- Dependencies: S1-003
- Description: Implement register, login, profile, logout service methods and context state.
- Acceptance Criteria:
  - Register and login complete successfully against Nexus Forge.
  - Session persistence and logout are working.
  - Unauthorized responses redirect to login path.

### S1-005 Role model and access policy baseline
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: S1-004
- Description: Define roles and enforce route-level access for admin-only actions.
- Acceptance Criteria:
  - Student cannot access admin queue route.
  - Admin can access protected moderation endpoints.
  - Access policy tests cover deny and allow cases.

---

## Epic S1-C: Data Model on Nexus Forge

### S1-006 Create and migrate custom tables in dashboard
- Type: Task
- Priority: High
- Estimate: 3 points
- Owner: Backend
- Dependencies: S1-003
- Description: Create lost_reports, found_reports, claims, handovers, report_media, match_candidates, notifications via dashboard JSON.
- Acceptance Criteria:
  - All required tables exist in project and are migrated.
  - Table schemas match project document field names.
  - Smoke insert and list operations pass for lost_reports and found_reports.

### S1-007 Add schema validation contracts in code
- Type: Task
- Priority: High
- Estimate: 3 points
- Owner: Backend
- Dependencies: S1-006
- Description: Add request DTO validators and response mappers for Sprint 1 endpoints.
- Acceptance Criteria:
  - Invalid payloads return validation errors.
  - DTO mapping is tested for key fields.

---

## Epic S1-D: Lost and Found Intake Vertical Slice

### S1-008 Implement lost report create and list API integration
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Full Stack
- Dependencies: S1-006, S1-007
- Description: Build frontend form and list view for lost reports using Nexus Forge table route.
- Acceptance Criteria:
  - User can create a lost report.
  - User can list and filter own lost reports.
  - Required fields and date validation are enforced.

### S1-009 Implement found report create and list API integration
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Full Stack
- Dependencies: S1-006, S1-007
- Description: Build frontend form and list view for found reports using Nexus Forge table route.
- Acceptance Criteria:
  - User can create a found report.
  - User can list and filter own found reports.
  - Ownership and visibility rules are respected.

### S1-010 Implement search and filters UI plus API params
- Type: Story
- Priority: Medium
- Estimate: 5 points
- Owner: Frontend
- Dependencies: S1-008, S1-009
- Description: Add category, status, date range, and keyword filtering with pagination.
- Acceptance Criteria:
  - Combined filters return expected narrowed results.
  - Pagination metadata is displayed and navigable.
  - Empty states are user-friendly.

---

## Epic S1-E: Quality and Test Gate

### S1-011 Add integration tests for intake flows
- Type: Task
- Priority: High
- Estimate: 5 points
- Owner: QA and Backend
- Dependencies: S1-008, S1-009
- Description: Test create/list/filter for lost and found endpoints with auth context.
- Acceptance Criteria:
  - Tests run in CI and pass reliably.
  - Negative tests cover unauthorized and invalid payloads.

### S1-012 Add end-to-end tests for core Sprint 1 journeys
- Type: Task
- Priority: High
- Estimate: 3 points
- Owner: QA and Frontend
- Dependencies: S1-008, S1-009, S1-010
- Description: E2E tests for register/login, create lost report, create found report, search history.
- Acceptance Criteria:
  - E2E suite passes in CI with deterministic fixtures.
  - Failure screenshots and traces are retained.

### S1-013 Sprint review demo checklist and release note draft
- Type: Task
- Priority: Medium
- Estimate: 2 points
- Owner: Product and Tech Lead
- Dependencies: S1-011, S1-012
- Description: Prepare demo script and release notes for Sprint 1 completion.
- Acceptance Criteria:
  - Demo script covers sprint goal end to end.
  - Known limitations are documented for Sprint 2 planning.

---

## Definition of Done for Sprint 1
- All High-priority stories are Done.
- CI passes with no blocking failures.
- Core user journeys are verified through e2e tests.
- Sprint review demo can be executed without manual database fixes.
