-- CreateTable
CREATE TABLE "notices" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" SMALLINT NOT NULL,
    "level" VARCHAR(32) NOT NULL DEFAULT 'L',
    "targetType" SMALLINT NOT NULL DEFAULT 1,
    "target_user_ids" JSONB,
    "publishStatus" SMALLINT NOT NULL DEFAULT 0,
    "publisher_id" BIGINT,
    "publish_time" TIMESTAMPTZ(3),
    "revoke_time" TIMESTAMPTZ(3),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_read_records" (
    "id" BIGSERIAL NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_read_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notices_publishStatus_publish_time_idx" ON "notices"("publishStatus", "publish_time");

-- CreateIndex
CREATE INDEX "notices_created_at_idx" ON "notices"("created_at");

-- CreateIndex
CREATE INDEX "notice_read_records_user_id_read_at_idx" ON "notice_read_records"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notice_read_records_notice_id_user_id_key" ON "notice_read_records"("notice_id", "user_id");
