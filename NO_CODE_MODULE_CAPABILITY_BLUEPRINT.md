# No-Code Dedicated Module Capability Blueprint
## Phase 2 Platform Evolution for Nexus Forge Style Projects

Date: 2026-04-21
Status: Proposed

---

## 1. Objective

Enable each tenant project to create and run dedicated business logic modules without writing backend code, while preserving:
- tenant isolation
- security
- auditability
- predictable performance

This document defines a practical implementation path from current table-driven workflows to a controlled no-code logic runtime.

---

## 2. Capability Definition

A no-code dedicated module is a user-defined executable workflow package containing:
- trigger definitions
- conditions
- transition rules
- actions
- error policies
- version metadata

Each module executes in tenant scope and can be attached to events such as:
- row created
- row updated
- scheduled job tick
- manual action button
- webhook received

---

## 3. Scope and Boundaries

### In scope
- visual workflow builder
- declarative rule model
- sandboxed execution runtime
- per-tenant module registry and versioning
- trace logs and rollback

### Out of scope for first iteration
- arbitrary user code execution
- unrestricted external network calls
- cross-tenant module sharing by default

---

## 4. High-Level Architecture

## 4.1 Components

1. Module Registry Service
- Stores module definitions and active versions per project.

2. Workflow Compiler
- Validates visual definitions and compiles to executable intermediate representation.

3. Workflow Runtime Engine
- Executes compiled graph deterministically with guarded resources.

4. Trigger Router
- Routes platform events into runtime invocations.

5. Action Adapters
- Safe built-in actions such as read table, write table, send notification, enqueue retry.

6. Execution Ledger
- Stores run history, step traces, outcomes, and latency metrics.

7. Policy Guard
- Enforces tenant permissions, action allow-lists, and data access scopes.

## 4.2 Execution Pattern

- Event arrives with project context.
- Trigger Router resolves active module versions.
- Runtime executes module graph step-by-step.
- Action outputs are persisted to Execution Ledger.
- Failures follow configured retry and dead-letter policy.

---

## 5. Suggested Data Model Additions

### module_definitions
- id
- project_id
- module_key
- display_name
- description
- status (draft, active, archived)
- active_version_id
- created_by
- created_at
- updated_at

### module_versions
- id
- module_definition_id
- version_number
- definition_json
- compiled_ir_json
- checksum
- created_by
- created_at

### module_triggers
- id
- module_version_id
- trigger_type
- trigger_config_json
- enabled

### module_runs
- id
- project_id
- module_key
- module_version_id
- trigger_event_id
- status (running, succeeded, failed, dead_lettered)
- started_at
- finished_at
- duration_ms
- error_summary

### module_run_steps
- id
- module_run_id
- step_key
- step_type
- input_json
- output_json
- status
- started_at
- finished_at
- error_json

### module_dead_letters
- id
- module_run_id
- reason
- payload_json
- retry_count
- created_at

---

## 6. API Surface Proposal

Base path: api/v1/p/:projectId/modules

### module lifecycle
- POST / create module definition
- GET / list modules
- GET /:moduleKey get module details
- PATCH /:moduleKey update metadata
- POST /:moduleKey/archive archive module

### version management
- POST /:moduleKey/versions create new version from builder JSON
- GET /:moduleKey/versions list versions
- POST /:moduleKey/versions/:version/activate activate version
- POST /:moduleKey/versions/:version/rollback rollback to version

### trigger and execution
- POST /:moduleKey/triggers add trigger
- PATCH /:moduleKey/triggers/:id enable or disable trigger
- POST /:moduleKey/execute manual run
- GET /:moduleKey/runs list runs
- GET /runs/:runId get run trace
- POST /runs/:runId/retry retry failed run

---

## 7. Builder and DSL Strategy

## 7.1 Builder Nodes (initial)
- Start
- Filter
- Branch
- Transform
- Read Table
- Write Table
- Update Row
- Emit Notification
- Wait and Retry
- End

## 7.2 Declarative Rule Model
- JSON graph with node ids and directed edges
- typed node schemas with strict validation
- explicit input and output contracts for each node type

## 7.3 Compiler Checks
- cycle detection where not allowed
- unreachable node detection
- undefined field reference rejection
- policy violation rejection before activation

---

## 8. Security and Governance Model

1. Tenant Isolation
- every execution bound to project_id context
- no cross-tenant data reads or writes

2. Action Permissions
- per-module action allow-list
- admin role required for activation

3. Secret Access
- modules reference named secrets only
- secret values never stored in module JSON

4. Runtime Limits
- max execution time
- max memory budget
- max outbound calls
- max retries

5. Audit Requirements
- create, activate, rollback, and run outcomes must emit audit records

---

## 9. Reliability and Observability

- distributed trace id per module run
- step-level latency and failure counters
- dead-letter queue with replay tooling
- run success rate and p95 duration dashboards
- alerting for failure bursts and retry storms

---

## 10. Rollout Plan

## Phase A: Foundation
- introduce registry tables
- introduce draft-only builder storage
- no runtime execution yet

Exit criteria:
- modules can be created, versioned, validated

## Phase B: Controlled Runtime MVP
- support manual execution trigger only
- support read and write table actions
- execution ledger and run traces

Exit criteria:
- deterministic execution with replayable traces

## Phase C: Event Triggers and Retries
- enable on-row-change triggers
- enable retry policy and dead-letter handling

Exit criteria:
- stable async execution under load tests

## Phase D: Production Hardening
- quota controls per project
- advanced observability
- rollback safety and incident runbooks

Exit criteria:
- platform SLO targets achieved for module runtime

---

## 11. First Practical Use Cases

1. Claims Decision Assistant
- Trigger: claim created
- Logic: score evidence quality and route priority
- Action: write claim_priority and notify admin queue

2. Handover Workflow Guard
- Trigger: handover requested
- Logic: verify claim status approved and report not closed
- Action: perform controlled transitions and write audit event

3. Duplicate Report Hinting
- Trigger: lost report created
- Logic: compare similarity with recent open reports
- Action: write duplicate hint and notify reporter

---

## 12. Risks and Mitigations

Risk: users build unsafe infinite workflows
- Mitigation: compiler validation and runtime step caps

Risk: noisy triggers cause cost spikes
- Mitigation: per-project quotas, debouncing, and batching

Risk: opaque failures reduce trust
- Mitigation: step traces, deterministic replay, and actionable errors

Risk: privilege escalation by module definitions
- Mitigation: strict action permission model and admin-only activation

---

## 13. Acceptance Criteria for This Platform Feature

- AC1 Tenant admin can create, version, and activate a module without coding.
- AC2 Module runs are traceable step-by-step with input and output logs.
- AC3 Runtime enforces tenant isolation and policy guards.
- AC4 Failed runs can be retried safely with idempotency protections.
- AC5 Activation and rollback are auditable and reversible.

---

## 14. Recommended Next Actions

1. Approve this blueprint as Phase 2 architecture target.
2. Implement Phase B scope only for pilot with manual triggers.
3. Apply feature to lost-and-found claim and handover workflows first.
4. Measure runtime stability before enabling broad tenant self-service.
