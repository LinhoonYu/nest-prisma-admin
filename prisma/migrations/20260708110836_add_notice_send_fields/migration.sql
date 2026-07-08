-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "expire_days" INTEGER,
ADD COLUMN     "send_mode" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "send_status" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "send_time" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "notices_send_mode_send_status_send_time_idx" ON "notices"("send_mode", "send_status", "send_time");
