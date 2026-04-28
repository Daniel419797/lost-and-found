# Phase 2 Critical Path
## No-Code Module Capability

Date: 2026-04-21
Source: PHASE_2_TASK_BOARD_NO_CODE_MODULES.md

---

## 1. Primary Critical Path

1. P2-001 Create module registry schema migrations
2. P2-002 Build module lifecycle API surface
3. P2-003 Implement version create and activate endpoints
4. P2-005 Define builder node schema contracts
5. P2-006 Implement workflow compiler and static validation
6. P2-008 Implement runtime engine core
7. P2-009 Implement safe action adapters
8. P2-011 Add manual execution endpoint and run viewer API
9. P2-015 Add event trigger router
10. P2-016 Implement retry policy and dead-letter queue
11. P2-023 Add load tests for trigger throughput and run latency
12. P2-024 Phase 2 release checklist and pilot enablement

Reason this is critical:
- It is the longest dependency chain that unlocks production-ready execution and reliability validation.

---

## 2. Secondary Blocking Path (Security and Governance)

1. P2-009 Safe action adapters
2. P2-012 Policy guard and action allow-list
3. P2-013 Runtime guardrails and quotas
4. P2-022 Security test suite for policy bypass attempts
5. P2-024 Phase 2 release checklist and pilot enablement

Reason this blocks release:
- Even if runtime works, Phase 2 cannot ship without policy enforcement and security validation.

---

## 3. Schedule Risk Points

- Compiler complexity risk: P2-006 may slip if schema scope expands beyond MVP nodes.
- Runtime correctness risk: P2-008 and P2-009 can slip due to context propagation and adapter edge cases.
- Trigger storm risk: P2-015 and P2-016 may require tuning iterations before stable load-test outcomes.
- Security hardening risk: P2-012 and P2-013 may trigger design changes if bypass vectors are discovered.

---

## 4. Mitigation Plan

- Freeze MVP node set before implementing P2-006.
- Run design review checkpoint before starting P2-008.
- Add synthetic event storm tests before formal P2-023 load tests.
- Start security test authoring early while building P2-012 and P2-013.

---

## 5. Exit Criteria for Critical Path Completion

- Manual and event-triggered module runs succeed in tenant scope.
- Retries and dead-letter behavior are deterministic and observable.
- Security tests show no unresolved high severity bypass issues.
- Load test report confirms acceptable p95 run latency and stable throughput.
- Pilot enablement checklist is signed off.