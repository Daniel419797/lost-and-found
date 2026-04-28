# Phase 2 Task Board
## No-Code Dedicated Module Capability

Date: 2026-04-21

## Phase Goal
Enable tenant admins to define, version, activate, and run project-scoped business logic modules without writing backend code, with secure execution, traceability, and rollback.

## Planned Timeline
- Sprint P2-1: Foundation and Definition Lifecycle (2 weeks)
- Sprint P2-2: Runtime MVP and Manual Execution (2 weeks)
- Sprint P2-3: Event Triggers, Reliability, and Hardening (2 weeks)

## Board Columns
- Todo
- In Progress
- Review
- Done
- Blocked

---

## Epic P2-A: Registry and Versioning Foundation

### P2-001 Create module registry schema migrations
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: None
- Description: Add schema and migrations for module_definitions, module_versions, module_triggers, module_runs, module_run_steps, module_dead_letters.
- Acceptance Criteria:
  - All new tables are created and queryable.
  - Foreign key and index strategy is verified.
  - Migration rollback path is tested.

### P2-002 Build module lifecycle API surface
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: P2-001
- Description: Implement create/list/get/update/archive module definition endpoints.
- Acceptance Criteria:
  - Tenant admin can create draft modules.
  - Module listing is tenant-isolated.
  - Archive transition is audited.

### P2-003 Implement version create and activate endpoints
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: P2-001, P2-002
- Description: Add endpoints to create a version from builder JSON and set active version.
- Acceptance Criteria:
  - Version numbers increment predictably.
  - Only one active version per module.
  - Activation writes audit log.

### P2-004 Build rollback endpoint for module versions
- Type: Task
- Priority: Medium
- Estimate: 3 points
- Owner: Backend
- Dependencies: P2-003
- Description: Add rollback endpoint to reactivate a prior version.
- Acceptance Criteria:
  - Rollback updates active version atomically.
  - Rollback events are auditable.

---

## Epic P2-B: Builder Contract and Compiler

### P2-005 Define builder node schema contracts
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend and Frontend
- Dependencies: P2-001
- Description: Define JSON schema for nodes, edges, triggers, and action payload contracts.
- Acceptance Criteria:
  - Schema supports start, filter, branch, read table, write table, notify, end nodes.
  - Invalid node configs are rejected with field-level errors.

### P2-006 Implement workflow compiler and static validation
- Type: Story
- Priority: High
- Estimate: 8 points
- Owner: Backend
- Dependencies: P2-005
- Description: Compile builder graph to executable IR with cycle checks, unreachable node checks, and policy checks.
- Acceptance Criteria:
  - Compiler emits deterministic IR for same input.
  - Invalid graphs fail activation with actionable errors.
  - Compiler tests cover major rejection scenarios.

### P2-007 Add definition checksum and integrity controls
- Type: Task
- Priority: Medium
- Estimate: 3 points
- Owner: Backend
- Dependencies: P2-006
- Description: Store checksums for definition and compiled IR to support tamper detection and reproducibility.
- Acceptance Criteria:
  - Checksum persists on version creation.
  - Runtime verifies checksum before execution.

---

## Epic P2-C: Runtime MVP (Manual Trigger Only)

### P2-008 Implement runtime engine core
- Type: Story
- Priority: High
- Estimate: 8 points
- Owner: Backend
- Dependencies: P2-006
- Description: Execute compiled module IR step-by-step with context propagation.
- Acceptance Criteria:
  - Engine supports linear and branched flows.
  - Step outputs are available to downstream nodes.
  - Runtime failures are captured with step context.

### P2-009 Implement safe action adapters (read and write table)
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: P2-008
- Description: Add adapter layer for table read and write operations with tenant scope enforcement.
- Acceptance Criteria:
  - Cross-tenant access is impossible.
  - Adapter errors are normalized to runtime error model.

### P2-010 Implement notification action adapter
- Type: Task
- Priority: Medium
- Estimate: 3 points
- Owner: Backend
- Dependencies: P2-008
- Description: Add built-in action to emit notifications into tenant notification store.
- Acceptance Criteria:
  - Notification action writes correct recipient payload.
  - Notification action errors are retriable.

### P2-011 Add manual execution endpoint and run viewer API
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: P2-008, P2-009
- Description: Enable manual trigger execution and run trace retrieval.
- Acceptance Criteria:
  - Admin can execute module manually.
  - Run list and step traces are available via API.

---

## Epic P2-D: Security, Policy, and Governance

### P2-012 Implement policy guard and action allow-list
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Security and Backend
- Dependencies: P2-009
- Description: Enforce role and action permissions per module and tenant.
- Acceptance Criteria:
  - Non-admin cannot activate modules.
  - Disallowed actions are blocked pre-execution.

### P2-013 Add runtime guardrails and quotas
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend and Platform
- Dependencies: P2-008
- Description: Add max runtime duration, step cap, retry cap, and per-project quotas.
- Acceptance Criteria:
  - Over-limit runs are terminated safely.
  - Quota breaches are surfaced clearly.

### P2-014 Add full audit coverage for module operations
- Type: Task
- Priority: High
- Estimate: 3 points
- Owner: Backend
- Dependencies: P2-002, P2-003, P2-011
- Description: Emit audit events for create, version, activate, rollback, execute, retry.
- Acceptance Criteria:
  - Audit records contain actor, action, module key, version, timestamp.

---

## Epic P2-E: Reliability and Event Triggers

### P2-015 Add event trigger router for row-create and row-update events
- Type: Story
- Priority: High
- Estimate: 8 points
- Owner: Backend
- Dependencies: P2-011
- Description: Route platform events to active module triggers and launch runtime executions.
- Acceptance Criteria:
  - Supported events can trigger correct module version.
  - Trigger dispatch is idempotent.

### P2-016 Implement retry policy and dead-letter queue
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Backend
- Dependencies: P2-011, P2-015
- Description: Add retry backoff and dead-letter storage for failed runs.
- Acceptance Criteria:
  - Failed runs retry based on policy.
  - Exhausted retries are dead-lettered with payload.

### P2-017 Add run replay and retry endpoints
- Type: Task
- Priority: Medium
- Estimate: 3 points
- Owner: Backend
- Dependencies: P2-016
- Description: Provide controlled rerun and retry endpoints for admin operators.
- Acceptance Criteria:
  - Admin can retry dead-letter runs.
  - Replay preserves correlation and trace metadata.

---

## Epic P2-F: UX and Operationalization

### P2-018 Build module list and detail UI
- Type: Story
- Priority: High
- Estimate: 5 points
- Owner: Frontend
- Dependencies: P2-002
- Description: Create admin screens for module lifecycle and version visibility.
- Acceptance Criteria:
  - Admin can view module status and active version.
  - List and detail states handle loading and errors.

### P2-019 Build basic visual builder UI (MVP nodes)
- Type: Story
- Priority: High
- Estimate: 8 points
- Owner: Frontend
- Dependencies: P2-005
- Description: Implement minimal drag/drop builder for MVP node set and save definition.
- Acceptance Criteria:
  - Admin can compose a valid module graph.
  - Definition validates and can be versioned.

### P2-020 Build run trace explorer UI
- Type: Task
- Priority: Medium
- Estimate: 5 points
- Owner: Frontend
- Dependencies: P2-011
- Description: Provide run list and step-level trace viewer for debugging.
- Acceptance Criteria:
  - Run detail includes step input and output summaries.
  - Failed steps are clearly highlighted.

---

## Epic P2-G: Validation, Performance, and Release

### P2-021 Add unit and integration test suites for compiler and runtime
- Type: Story
- Priority: High
- Estimate: 8 points
- Owner: QA and Backend
- Dependencies: P2-006, P2-008
- Description: Build robust automated tests for compile and execute paths.
- Acceptance Criteria:
  - Compiler and runtime critical paths exceed 80 percent coverage.
  - Deterministic execution tests pass reliably.

### P2-022 Add security test suite for policy bypass attempts
- Type: Task
- Priority: High
- Estimate: 5 points
- Owner: Security and QA
- Dependencies: P2-012, P2-013
- Description: Validate no privilege escalation or cross-tenant access through module runtime.
- Acceptance Criteria:
  - All known bypass tests are blocked.
  - Findings triaged and resolved before release.

### P2-023 Add load tests for trigger throughput and run latency
- Type: Task
- Priority: Medium
- Estimate: 5 points
- Owner: QA and Platform
- Dependencies: P2-015, P2-016
- Description: Measure performance under expected event load and trigger fanout.
- Acceptance Criteria:
  - Throughput and p95 run latency metrics documented.
  - Capacity recommendations produced.

### P2-024 Phase 2 release checklist and pilot enablement
- Type: Task
- Priority: Medium
- Estimate: 3 points
- Owner: Product and Tech Lead
- Dependencies: P2-021, P2-022, P2-023
- Description: Prepare release notes, runbooks, and pilot tenant rollout steps.
- Acceptance Criteria:
  - Pilot checklist is complete.
  - Rollback and incident playbook validated.

---

## Initial Pilot Workflows (Post-Release Validation)

1. Claim Priority Assistant
- Trigger: claim created
- Outcome: claim_priority field set and admin notified

2. Handover Guard
- Trigger: handover requested
- Outcome: state validation and controlled transition

3. Duplicate Lost Report Hint
- Trigger: lost report created
- Outcome: duplicate warning notification to reporter

---

## Definition of Done for Phase 2
- Tenant admin can create, version, activate, and manually run modules without code.
- Event triggers execute safely with traceable outcomes.
- Policy guard and tenant isolation validated by security tests.
- Retry and dead-letter handling operational with admin recovery flows.
- Run traces and audit logs provide full operational observability.
