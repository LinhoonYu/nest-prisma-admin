-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_file_id" BIGINT;

-- CreateTable
CREATE TABLE "files" (
    "id" BIGSERIAL NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "size" BIGINT NOT NULL,
    "bucket_name" VARCHAR(128) NOT NULL,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" BIGINT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_relations" (
    "id" BIGSERIAL NOT NULL,
    "file_id" BIGINT NOT NULL,
    "ref_table" VARCHAR(64) NOT NULL,
    "ref_id" BIGINT NOT NULL,
    "ref_field" VARCHAR(64) NOT NULL,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "files_object_key_key" ON "files"("object_key");

-- CreateIndex
CREATE INDEX "files_created_by_idx" ON "files"("created_by");

-- CreateIndex
CREATE INDEX "files_created_at_idx" ON "files"("created_at");

-- CreateIndex
CREATE INDEX "file_relations_ref_table_ref_id_idx" ON "file_relations"("ref_table", "ref_id");

-- CreateIndex
CREATE INDEX "file_relations_ref_table_ref_id_ref_field_idx" ON "file_relations"("ref_table", "ref_id", "ref_field");

-- CreateIndex
CREATE UNIQUE INDEX "file_relations_file_id_ref_table_ref_id_ref_field_key" ON "file_relations"("file_id", "ref_table", "ref_id", "ref_field");
