-- CreateTable
CREATE TABLE "configs" (
    "id" BIGSERIAL NOT NULL,
    "config_name" VARCHAR(64) NOT NULL,
    "config_key" VARCHAR(128) NOT NULL,
    "config_value" VARCHAR(512) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "configs_config_key_idx" ON "configs"("config_key");

-- CreateIndex
CREATE UNIQUE INDEX "configs_config_key_key" ON "configs"("config_key");
