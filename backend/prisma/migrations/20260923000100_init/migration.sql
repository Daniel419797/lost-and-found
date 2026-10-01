CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(320) NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "password_hash" VARCHAR(255),
  "role" VARCHAR(32) NOT NULL DEFAULT 'student',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lost_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reporter_user_id" UUID NOT NULL,
  "item_title" VARCHAR(180) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "color" VARCHAR(80),
  "brand" VARCHAR(120),
  "description" TEXT,
  "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "location_lost" VARCHAR(180) NOT NULL,
  "date_lost" DATE NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lost_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "found_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "finder_user_id" UUID NOT NULL,
  "item_title" VARCHAR(180) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "color" VARCHAR(80),
  "brand" VARCHAR(120),
  "description" TEXT,
  "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "location_found" VARCHAR(180) NOT NULL,
  "date_found" DATE NOT NULL,
  "custody_location" VARCHAR(180),
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "found_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claims" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "linked_lost_report_id" UUID,
  "found_report_id" UUID NOT NULL,
  "claimant_user_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "evidence_text" TEXT NOT NULL,
  "reviewed_by_user_id" UUID,
  "decision_reason" TEXT,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_candidates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lost_report_id" UUID NOT NULL,
  "found_report_id" UUID NOT NULL,
  "score" INTEGER NOT NULL,
  "factors_json" JSONB NOT NULL,
  "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unique_pair_hash" CHAR(64) NOT NULL,
  "notified_at" TIMESTAMPTZ(3),
  CONSTRAINT "match_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "handovers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claim_id" UUID NOT NULL,
  "officer_user_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ready',
  "handover_point" VARCHAR(180) NOT NULL,
  "handover_time" TIMESTAMPTZ(3) NOT NULL,
  "completed_at" TIMESTAMPTZ(3),
  "completed_by_user_id" UUID,
  "evidence_url" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "handovers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipient_user_id" UUID NOT NULL,
  "type" VARCHAR(64) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "meta_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "action" VARCHAR(100) NOT NULL,
  "resource" VARCHAR(100),
  "resource_id" VARCHAR(100),
  "details" JSONB NOT NULL,
  "user_id" UUID,
  "ip_address" VARCHAR(80),
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");
CREATE INDEX "refresh_sessions_user_id_expires_at_idx" ON "refresh_sessions"("user_id", "expires_at");
CREATE INDEX "lost_reports_status_created_at_idx" ON "lost_reports"("status", "created_at");
CREATE INDEX "lost_reports_category_status_idx" ON "lost_reports"("category", "status");
CREATE INDEX "lost_reports_reporter_user_id_created_at_idx" ON "lost_reports"("reporter_user_id", "created_at");
CREATE INDEX "found_reports_status_created_at_idx" ON "found_reports"("status", "created_at");
CREATE INDEX "found_reports_category_status_idx" ON "found_reports"("category", "status");
CREATE INDEX "found_reports_finder_user_id_created_at_idx" ON "found_reports"("finder_user_id", "created_at");
CREATE UNIQUE INDEX "claims_found_report_id_claimant_user_id_key" ON "claims"("found_report_id", "claimant_user_id");
CREATE INDEX "claims_claimant_user_id_created_at_idx" ON "claims"("claimant_user_id", "created_at");
CREATE INDEX "claims_status_created_at_idx" ON "claims"("status", "created_at");
CREATE INDEX "claims_found_report_id_status_idx" ON "claims"("found_report_id", "status");
CREATE UNIQUE INDEX "match_candidates_unique_pair_hash_key" ON "match_candidates"("unique_pair_hash");
CREATE UNIQUE INDEX "match_candidates_lost_report_id_found_report_id_key" ON "match_candidates"("lost_report_id", "found_report_id");
CREATE INDEX "match_candidates_lost_report_id_score_idx" ON "match_candidates"("lost_report_id", "score");
CREATE INDEX "match_candidates_found_report_id_score_idx" ON "match_candidates"("found_report_id", "score");
CREATE UNIQUE INDEX "handovers_claim_id_key" ON "handovers"("claim_id");
CREATE INDEX "handovers_status_handover_time_idx" ON "handovers"("status", "handover_time");
CREATE INDEX "notifications_recipient_user_id_is_read_created_at_idx" ON "notifications"("recipient_user_id", "is_read", "created_at");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lost_reports" ADD CONSTRAINT "lost_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "found_reports" ADD CONSTRAINT "found_reports_finder_user_id_fkey" FOREIGN KEY ("finder_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_linked_lost_report_id_fkey" FOREIGN KEY ("linked_lost_report_id") REFERENCES "lost_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_found_report_id_fkey" FOREIGN KEY ("found_report_id") REFERENCES "found_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_user_id_fkey" FOREIGN KEY ("claimant_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_lost_report_id_fkey" FOREIGN KEY ("lost_report_id") REFERENCES "lost_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_found_report_id_fkey" FOREIGN KEY ("found_report_id") REFERENCES "found_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_officer_user_id_fkey" FOREIGN KEY ("officer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
