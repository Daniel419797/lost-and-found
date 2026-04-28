# Phase 2 Start-Tomorrow Subset
## First 6 Tickets for Immediate Kickoff

Date: 2026-04-21

---

## 1. Purpose

Provide an execution-ready subset of six tickets that can start immediately and unlock the critical path quickly.

---

## 2. Ticket Subset

### T1: P2-001 Create module registry schema migrations
- Why first: all backend lifecycle work depends on these tables.
- Owner: Backend
- Estimate: 5 points
- Deliverable by end of day:
  - migration files created
  - migration applied locally
  - rollback verified once

### T2: P2-002 Build module lifecycle API surface
- Dependency: P2-001
- Owner: Backend
- Estimate: 5 points
- Deliverable by end of day:
  - create/list/get/update/archive endpoints scaffolded
  - tenant scope checks included

### T3: P2-005 Define builder node schema contracts
- Dependency: P2-001
- Owner: Backend and Frontend
- Estimate: 5 points
- Deliverable by end of day:
  - JSON schemas for MVP nodes
  - validation tests for valid and invalid examples

### T4: P2-003 Implement version create and activate endpoints
- Dependencies: P2-001, P2-002
- Owner: Backend
- Estimate: 5 points
- Deliverable by end of day:
  - version create endpoint
  - activate endpoint with active-version uniqueness enforcement

### T5: P2-006 Implement workflow compiler and static validation
- Dependency: P2-005
- Owner: Backend
- Estimate: 8 points
- Deliverable by end of day:
  - compile pipeline skeleton
  - cycle and unreachable-node checks implemented

### T6: P2-018 Build module list and detail UI
- Dependency: P2-002
- Owner: Frontend
- Estimate: 5 points
- Deliverable by end of day:
  - admin module list page
  - module detail page with status and versions section placeholders

---

## 3. Day-1 Execution Plan

Block A (Backend)
1. Start P2-001
2. Branch into P2-002 and P2-005 in parallel once schema is merged
3. Start P2-003 after P2-002 baseline routes are ready

Block B (Frontend)
1. Start P2-018 as soon as P2-002 endpoint contracts are stable
2. Use mock responses for initial UI while backend routes finalize

Block C (Compiler)
1. Begin P2-006 after P2-005 schema freeze
2. Keep MVP node set fixed for first compile pass

---

## 4. Immediate Handoff Checklist

- Architecture checkpoint scheduled before coding P2-006 runtime-adjacent logic
- API contract examples for P2-002 and P2-003 shared with frontend owner
- CI gate includes new migration and schema test jobs

---

## 5. Success Criteria for Tomorrow

- P2-001 merged and verified
- P2-002 endpoint skeleton merged
- P2-005 schema contract merged
- P2-003 activation flow skeleton in review
- P2-006 compiler skeleton started
- P2-018 UI skeleton started

If all six are in progress or better by end of day, Phase 2 remains on-track.