# Product Requirements Document
## Web-Based Lost and Found Management System for University Campuses

Version: 1.0  
Date: 2026-04-21

---

## 1. Problem Statement

Students and staff lose personal items frequently across campus locations such as lecture halls, labs, hostels, libraries, and cafeterias. Existing recovery processes are informal and fragmented across security desks, student associations, social media groups, and word-of-mouth channels.

This causes:
- Low item recovery rates
- Delayed reunification due to poor discoverability
- Fraudulent claims due to weak ownership verification
- No audit trail for accountability

The product will provide a centralized campus platform for reporting lost and found items, matching reports, managing claims, and tracking handover outcomes.

---

## 2. Product Vision

Build a secure, auditable, and user-friendly system that improves item recovery rate and reduces claim fraud for university campuses.

---

## 3. Goals and Success Metrics

### 3.1 Product Goals
- Provide a single source of truth for all lost and found reports
- Reduce average time-to-recovery
- Improve claim verification quality
- Enable administrative oversight with complete audit logs

### 3.2 Measurable KPIs
- Recovery rate >= 45% by end of pilot semester
- Median time from report creation to first relevant match <= 6 hours
- Fraudulent claim approval rate <= 2%
- System uptime >= 99.5%
- P95 API latency <= 500 ms under normal load

---

## 4. Target Users

- Student: reports lost items, submits claims, tracks status
- Finder (student or staff): reports found items and handover details
- Security/Admin Officer: verifies claims and confirms handovers
- Super Admin: manages campus settings, moderation policy, and analytics

---

## 5. Scope

### 5.1 In Scope
- User registration/login and role-based access
- Lost item report submission
- Found item report submission
- Search and filtering
- Automated similarity-based candidate matching
- Claim request workflow with evidence
- Admin approval/rejection and handover confirmation
- Notifications (in-app and optional email)
- Audit trail and activity history
- Basic analytics dashboard

### 5.2 Out of Scope (V1)
- Native mobile apps
- Biometric identity verification
- Payment or reward escrow
- OCR auto-extraction from images
- Multi-university federation in one deployment

---

## 6. Functional Requirements (MoSCoW)

### Must Have
- F1 Authentication and authorization
- F2 Lost report creation and management
- F3 Found report creation and management
- F4 Search and filters by category, location, date, status
- F5 Candidate match generation (rule-based/scored)
- F6 Claim submission with ownership evidence
- F7 Admin review queue and claim decision
- F8 Handover scheduling and completion confirmation
- F9 Audit log for all sensitive actions

### Should Have
- S1 Email notifications for status changes
- S2 Dashboard metrics by category/location/time
- S3 Duplicate report detection hints
- S4 Ban/report abusive users

### Could Have
- C1 QR code for handover checkpoints
- C2 Campus map view for found locations
- C3 Multi-language support

---

## 7. Non-Functional Requirements

- Security: OWASP-aligned input validation, secure auth, role checks, auditability
- Privacy: minimize PII exposure, configurable retention and data erasure paths
- Performance: P95 read endpoints < 500 ms at expected load
- Reliability: graceful degradation and retries for notifications
- Availability: 99.5% monthly uptime target
- Accessibility: WCAG 2.1 AA for key workflows
- Maintainability: typed contracts and modular service architecture

---

## 8. Core User Flows

### 8.1 Lost Item Flow
1. User creates lost report with category, descriptors, location, date, media
2. System validates and stores report
3. Matching engine computes candidate found reports
4. User views candidate matches and can file claim

### 8.2 Found Item Flow
1. Finder submits found report
2. System runs matching against open lost reports
3. Potential owners are notified

### 8.3 Claim and Handover Flow
1. User submits claim with evidence
2. Admin reviews claim and score explanation
3. Admin approves/rejects
4. If approved, handover is scheduled and completed
5. System closes relevant records and writes audit events

---

## 9. Risks and Mitigations

- Risk: false ownership claims
  - Mitigation: evidence fields, admin approval gate, strict audit trail
- Risk: privacy leakage via report details
  - Mitigation: role-based field redaction and masked public views
- Risk: duplicate/noisy reports
  - Mitigation: duplicate hints and merge tooling in admin queue

---

## 10. Acceptance Criteria (System-Level)

- AC1 Users can create, edit, and close lost/found reports with validation
- AC2 System generates and displays ranked candidate matches
- AC3 Claim approval is restricted to authorized admin roles
- AC4 Handover completion updates item and claim state atomically
- AC5 Audit logs capture who did what, when, and from where (where applicable)
- AC6 Core flows pass UAT scenarios across all roles

---

## 11. Release Strategy

- Phase 1: Core reporting + search + auth
- Phase 2: Matching + claims + admin review
- Phase 3: Hardening, analytics, and pilot rollout

---

## 12. Standard Software Process Mapping

- Requirements: this PRD + SRS baseline
- Design: SDD + data model + API contract
- Implementation: milestone plan with test gates
- Verification: test strategy and UAT sign-off
- Deployment: staged release with monitoring
- Maintenance: feedback loop and backlog updates
