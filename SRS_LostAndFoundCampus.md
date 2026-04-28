# Software Requirements Specification
## Web-Based Lost and Found Management System for University Campuses

Version: 1.0  
Date: 2026-04-21

---

## 1. Introduction

### 1.1 Purpose
Define detailed software requirements for building, testing, and deploying a campus lost-and-found platform.

### 1.2 Scope
The system supports report intake, matching, claim verification, handover closure, and administrative governance.

### 1.3 Definitions
- Lost Report: user declaration of missing item
- Found Report: user declaration of discovered item
- Claim: ownership request against found report
- Handover: controlled transfer of item to verified owner

---

## 2. Overall Description

### 2.1 Product Perspective
A web application with role-based access and backend services for matching and workflow state transitions.

### 2.2 User Classes
- Student/User
- Finder/User
- Admin Officer
- Super Admin

### 2.3 Operating Environment
- Web browsers: latest Chrome, Edge, Firefox, Safari
- Backend runtime: Node.js + relational database
- Deployment: containerized cloud/VPS

---

## 3. External Interface Requirements

### 3.1 User Interface
- Responsive dashboard and forms
- Role-specific admin work queue
- Status timeline for reports and claims

### 3.2 API Interfaces
- REST JSON endpoints under api/v1
- Bearer token authentication
- Structured error responses with codes

### 3.3 Database Interfaces
- Relational schema with constraints and indexes
- Transactional updates for claim decisions and handovers

---

## 4. Functional Requirements

### FR-01 Account Registration
- Input: name, email, password
- Validation: unique email, password policy
- Output: user profile and authenticated session

Acceptance:
- Duplicate email returns conflict error
- Password policy errors returned with field context

### FR-02 Login and Session
- Input: email, password
- Output: access token and active session context

Acceptance:
- Invalid credentials produce unauthorized response
- Authenticated user can access protected endpoints

### FR-03 Create Lost Report
- Input: title, category, color, brand, location lost, date lost, description, optional images
- Output: created lost report with status Open

Acceptance:
- Required fields enforced
- Created report visible in user history

### FR-04 Create Found Report
- Input: title, category, color, brand, location found, date found, description, optional images, custody location
- Output: created found report with status Open

Acceptance:
- Required fields enforced
- Created report visible in finder history and admin queue

### FR-05 Search and Filter
- Input: query params for category, location, date range, status, keyword
- Output: paginated report results

Acceptance:
- Result count and pagination metadata returned
- Filters can be combined

### FR-06 Candidate Matching
- Trigger: report creation/update
- Behavior: compute similarity score across category, color, text features, date-location proximity
- Output: ranked candidate list with score and factors

Acceptance:
- Scores normalized 0 to 100
- Top candidates retrievable for both lost and found report views

### FR-07 Claim Submission
- Input: foundReportId, narrative proof, distinguishing details, optional attachments
- Output: created claim with status Pending

Acceptance:
- One active claim per user per found report
- Claim references immutable evidence snapshot

### FR-08 Claim Review Decision
- Actor: admin officer
- Input: claimId, decision Approve or Reject, reason
- Output: updated claim status and audit entry

Acceptance:
- Non-admin decision attempt is forbidden
- Decision reason required on rejection

### FR-09 Handover Completion
- Actor: admin officer
- Input: claimId, handover metadata (time, point, officer)
- Output: claim status Completed, found report status Closed, linked lost report status Recovered

Acceptance:
- State transition is atomic
- Duplicate completion is prevented

### FR-10 Notifications
- Trigger: match found, claim submitted, decision made, handover scheduled/completed
- Output: in-app notification records and optional email dispatch

Acceptance:
- Notification appears in recipient inbox
- Failures are retried with capped backoff

### FR-11 Audit Logging
- Trigger: create/update/delete/decision/security events
- Output: immutable audit entry

Acceptance:
- Includes actor, action, target entity, timestamp
- Queryable by admin role

---

## 5. Data Requirements

- Data retention policy configurable by admin
- Personal data minimized in public/peer views
- Soft-delete for moderation artifacts where legally required
- Hard-delete path for user erasure requests

---

## 6. Non-Functional Requirements

### NFR-01 Security
- Role-based authorization enforced server-side
- Input validation on all write endpoints
- Secure password hashing and token handling

### NFR-02 Performance
- P95 latency for core reads <= 500 ms at pilot traffic profile

### NFR-03 Availability
- Monthly uptime target >= 99.5%

### NFR-04 Reliability
- Exactly-once semantics for handover completion and claim transitions

### NFR-05 Usability
- Main actions achievable within 3 clicks from dashboard

### NFR-06 Accessibility
- Keyboard navigability and sufficient contrast on key workflows

---

## 7. State Models

### 7.1 Found Report State
Open -> Claimed -> Verified -> Closed

### 7.2 Claim State
Pending -> Approved -> Completed
Pending -> Rejected

### 7.3 Lost Report State
Open -> Matched -> Recovered
Open -> Closed_Unrecovered

---

## 8. Assumptions and Dependencies

- Campus has designated verification officers
- Users provide truthful distinguishing details
- Email gateway availability for optional notifications

---

## 9. Verification Matrix Seed

- FR-03 to FR-05: integration and e2e tests
- FR-06: unit tests for scoring + regression dataset checks
- FR-08 and FR-09: authorization and transaction tests
- FR-11: audit completeness tests

---

## 10. Approval and Change Control

- Baseline changes require version bump and traceability note
- Each requirement change must map to implementation and test impact
