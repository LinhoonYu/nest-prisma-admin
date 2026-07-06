-- 1. Add provider_code column (nullable first, for data migration)
ALTER TABLE "user_identities" ADD COLUMN "provider_code" VARCHAR(64);

-- 2. Add provider_metadata_json column
ALTER TABLE "user_identities" ADD COLUMN "provider_metadata_json" JSONB;

-- 3. Migrate data: fill provider_code from auth_providers.code via provider_id
UPDATE "user_identities" ui
SET "provider_code" = ap."code"
FROM "auth_providers" ap
WHERE ui."provider_id" = ap."id";

-- 4. Make provider_code NOT NULL
ALTER TABLE "user_identities" ALTER COLUMN "provider_code" SET NOT NULL;

-- 5. Drop old unique indexes on user_identities
DROP INDEX "user_identities_provider_id_provider_subject_deleted_id_key";
DROP INDEX "user_identities_user_id_provider_id_deleted_id_key";
DROP INDEX "user_identities_provider_id_idx";

-- 6. Drop raw_profile_json column
ALTER TABLE "user_identities" DROP COLUMN "raw_profile_json";

-- 7. Drop provider_id column
ALTER TABLE "user_identities" DROP COLUMN "provider_id";

-- 8. Add new unique indexes and indexes
CREATE UNIQUE INDEX "user_identities_provider_code_provider_subject_deleted_id_key" ON "user_identities"("provider_code", "provider_subject", "deleted_id");
CREATE UNIQUE INDEX "user_identities_user_id_provider_code_deleted_id_key" ON "user_identities"("user_id", "provider_code", "deleted_id");
CREATE INDEX "user_identities_provider_code_idx" ON "user_identities"("provider_code");

-- 9. Drop email unique index on users
DROP INDEX "users_email_deleted_id_key";

-- 10. Drop auth_providers table
DROP TABLE "auth_providers";
