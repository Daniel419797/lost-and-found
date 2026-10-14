CREATE TABLE "media_objects" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "content_type" VARCHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_objects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "media_objects_owner_user_id_created_at_idx"
ON "media_objects"("owner_user_id", "created_at");

ALTER TABLE "media_objects"
ADD CONSTRAINT "media_objects_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;