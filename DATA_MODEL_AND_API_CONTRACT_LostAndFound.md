# Data Model and API Contract
## Web-Based Lost and Found Management System for University Campuses

Version: 1.0  
Date: 2026-04-21

---

## 1. Domain Data Model

## 1.1 Core Entities

### users
- id: uuid, pk
- email: varchar(255), unique, not null
- display_name: varchar(120), not null
- role: enum(student, staff, admin, super_admin), not null, default student
- password_hash: text, not null
- created_at: timestamptz, not null, default now
- updated_at: timestamptz, not null

Indexes:
- unique(email)
- index(role)

### lost_reports
- id: uuid, pk
- reporter_user_id: uuid, fk users.id, not null
- item_title: varchar(140), not null
- category: varchar(40), not null
- color: varchar(40), nullable
- brand: varchar(80), nullable
- description: text, not null
- location_lost: varchar(160), not null
- date_lost: date, not null
- status: enum(open, matched, recovered, closed_unrecovered), not null, default open
- created_at: timestamptz, not null, default now
- updated_at: timestamptz, not null

Indexes:
- index(reporter_user_id, created_at desc)
- index(status)
- index(category)
- index(date_lost)

### found_reports
- id: uuid, pk
- finder_user_id: uuid, fk users.id, not null
- item_title: varchar(140), not null
- category: varchar(40), not null
- color: varchar(40), nullable
- brand: varchar(80), nullable
- description: text, not null
- location_found: varchar(160), not null
- date_found: date, not null
- custody_location: varchar(160), nullable
- status: enum(open, claimed, verified, closed), not null, default open
- created_at: timestamptz, not null, default now
- updated_at: timestamptz, not null

Indexes:
- index(finder_user_id, created_at desc)
- index(status)
- index(category)
- index(date_found)

### report_media
- id: uuid, pk
- owner_type: enum(lost, found, claim), not null
- owner_id: uuid, not null
- media_url: text, not null
- media_type: enum(image), not null
- created_at: timestamptz, not null, default now

Indexes:
- index(owner_type, owner_id)

### match_candidates
- id: uuid, pk
- lost_report_id: uuid, fk lost_reports.id, not null
- found_report_id: uuid, fk found_reports.id, not null
- score: numeric(5,2), not null
- factors_json: jsonb, not null
- computed_at: timestamptz, not null, default now
- unique_pair_hash: varchar(80), unique, not null

Indexes:
- index(lost_report_id, score desc)
- index(found_report_id, score desc)

### claims
- id: uuid, pk
- found_report_id: uuid, fk found_reports.id, not null
- claimant_user_id: uuid, fk users.id, not null
- linked_lost_report_id: uuid, fk lost_reports.id, nullable
- evidence_text: text, not null
- status: enum(pending, approved, rejected, completed), not null, default pending
- decision_reason: text, nullable
- reviewed_by_user_id: uuid, fk users.id, nullable
- reviewed_at: timestamptz, nullable
- created_at: timestamptz, not null, default now
- updated_at: timestamptz, not null

Indexes:
- unique(found_report_id, claimant_user_id, status) where status in (pending, approved)
- index(found_report_id, created_at desc)
- index(claimant_user_id, created_at desc)
- index(status)

### handovers
- id: uuid, pk
- claim_id: uuid, fk claims.id, unique, not null
- officer_user_id: uuid, fk users.id, not null
- handover_point: varchar(160), not null
- handover_time: timestamptz, not null
- notes: text, nullable
- created_at: timestamptz, not null, default now

Indexes:
- unique(claim_id)
- index(handover_time)

### notifications
- id: uuid, pk
- recipient_user_id: uuid, fk users.id, not null
- type: varchar(60), not null
- title: varchar(160), not null
- body: text, not null
- is_read: boolean, not null, default false
- meta_json: jsonb, nullable
- created_at: timestamptz, not null, default now

Indexes:
- index(recipient_user_id, is_read, created_at desc)

### audit_logs
- id: uuid, pk
- actor_user_id: uuid, fk users.id, nullable
- action: varchar(80), not null
- entity_type: varchar(40), not null
- entity_id: uuid, nullable
- details_json: jsonb, nullable
- created_at: timestamptz, not null, default now

Indexes:
- index(actor_user_id, created_at desc)
- index(entity_type, entity_id)

---

## 2. Relationship Summary

- users one-to-many lost_reports
- users one-to-many found_reports
- lost_reports many-to-many found_reports through match_candidates
- found_reports one-to-many claims
- claims one-to-one handovers
- users one-to-many notifications
- all critical mutations write audit_logs

---

## 3. API Contract

Base path: /api/v1

Authentication:
- Protected endpoints require Authorization: Bearer token

Response envelope:
- success: boolean
- message: string
- data: object or array
- error: optional code and details

### 3.1 Auth

POST /auth/register
- body: displayName, email, password
- 201: user profile + access token

POST /auth/login
- body: email, password
- 200: user profile + access token

GET /auth/me
- 200: current user profile

POST /auth/logout
- 200: logout confirmation

### 3.2 Lost Reports

POST /lost-reports
- body: itemTitle, category, color, brand, description, locationLost, dateLost
- 201: created lost report

GET /lost-reports
- query: status, category, fromDate, toDate, search, limit, offset
- 200: paginated list

GET /lost-reports/:id
- 200: report detail + top match candidates

PATCH /lost-reports/:id
- body: editable fields while not recovered
- 200: updated report

POST /lost-reports/:id/media
- body: mediaUrl
- 201: media record

### 3.3 Found Reports

POST /found-reports
- body: itemTitle, category, color, brand, description, locationFound, dateFound, custodyLocation
- 201: created found report

GET /found-reports
- query: status, category, fromDate, toDate, search, limit, offset
- 200: paginated list

GET /found-reports/:id
- 200: report detail + claim summary + top candidates

PATCH /found-reports/:id
- body: editable fields until closed
- 200: updated report

POST /found-reports/:id/media
- body: mediaUrl
- 201: media record

### 3.4 Matching

GET /matches
- query: reportType (lost or found), reportId, limit
- 200: ranked candidate list with score and factors

POST /matches/recompute/:reportType/:reportId
- role: admin
- 202: recompute queued or executed

### 3.5 Claims

POST /claims
- body: foundReportId, linkedLostReportId optional, evidenceText
- 201: created claim

GET /claims/my
- 200: claimant claims list

GET /claims/review-queue
- role: admin
- 200: pending claims with context

PATCH /claims/:id/decision
- role: admin
- body: decision approve or reject, reason
- 200: updated claim

### 3.6 Handovers

POST /handovers
- role: admin
- body: claimId, handoverPoint, handoverTime, notes
- 201: created handover and workflow closure

GET /handovers/:id
- role: admin or owner
- 200: handover record

### 3.7 Notifications

GET /notifications
- query: unreadOnly, limit, offset
- 200: list

PATCH /notifications/:id/read
- 200: marked as read

### 3.8 Admin and Audit

GET /admin/metrics
- role: admin
- 200: KPI summary

GET /admin/audit-logs
- role: admin
- query: actor, entityType, fromDate, toDate, limit, offset
- 200: paginated audit entries

---

## 4. Validation Rules Highlights

- category must be predefined enum values
- dateLost and dateFound cannot be future dates beyond configurable tolerance
- evidenceText minimum length 20
- claim decision requires reason on rejection
- handover cannot occur for non-approved claims

---

## 5. Transaction Rules

On handover creation:
1. claim status changes approved to completed
2. found report changes verified to closed
3. linked lost report changes matched to recovered when provided
4. audit logs inserted for each state transition

All steps run in one database transaction.

---

## 6. Error Code Set

- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- CONFLICT
- INVALID_STATE
- RATE_LIMIT_EXCEEDED
- INTERNAL_ERROR
