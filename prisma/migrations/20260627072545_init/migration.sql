-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "nickname" VARCHAR(64),
    "real_name" VARCHAR(64),
    "avatar" VARCHAR(512),
    "email" VARCHAR(128),
    "phone" VARCHAR(32),
    "gender" SMALLINT NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "dept_id" BIGINT,
    "remark" VARCHAR(512),
    "last_login_at" TIMESTAMPTZ(3),
    "last_login_ip" VARCHAR(64),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "password_algo" VARCHAR(32) NOT NULL DEFAULT 'bcrypt',
    "password_version" INTEGER NOT NULL DEFAULT 1,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "password_changed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_providers" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" SMALLINT NOT NULL,
    "issuer" VARCHAR(255),
    "client_id" VARCHAR(255),
    "client_secret_encrypted" TEXT,
    "authorization_url" VARCHAR(512),
    "token_url" VARCHAR(512),
    "userinfo_url" VARCHAR(512),
    "jwks_uri" VARCHAR(512),
    "scopes" VARCHAR(512),
    "config_json" JSONB,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "provider_username" VARCHAR(128),
    "provider_email" VARCHAR(128),
    "provider_avatar" VARCHAR(512),
    "raw_profile_json" JSONB,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depts" (
    "id" BIGSERIAL NOT NULL,
    "parent_id" BIGINT,
    "name" VARCHAR(64) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "leader_user_id" BIGINT,
    "phone" VARCHAR(32),
    "email" VARCHAR(128),
    "status" SMALLINT NOT NULL DEFAULT 1,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "depts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "data_scope" SMALLINT NOT NULL DEFAULT 2,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" BIGSERIAL NOT NULL,
    "parent_id" BIGINT,
    "type" SMALLINT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "path" VARCHAR(255),
    "component" VARCHAR(255),
    "redirect" VARCHAR(255),
    "icon" VARCHAR(128),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "keep_alive" BOOLEAN NOT NULL DEFAULT false,
    "always_show" BOOLEAN NOT NULL DEFAULT false,
    "external_url" VARCHAR(512),
    "active_menu_id" BIGINT,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_menus" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" SMALLINT NOT NULL,
    "module" VARCHAR(64),
    "action" VARCHAR(64),
    "menu_id" BIGINT,
    "method" VARCHAR(16),
    "path" VARCHAR(255),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_depts" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "dept_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_depts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dict_types" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "dict_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dict_items" (
    "id" BIGSERIAL NOT NULL,
    "dict_type_id" BIGINT NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "value" VARCHAR(128) NOT NULL,
    "color" VARCHAR(32),
    "css_class" VARCHAR(128),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(512),
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_id" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "dict_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "login_type" SMALLINT NOT NULL,
    "provider" VARCHAR(64) NOT NULL DEFAULT 'local',
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "device_name" VARCHAR(128),
    "status" SMALLINT NOT NULL DEFAULT 1,
    "last_active_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revoke_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "session_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "family_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_id" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "username" VARCHAR(128),
    "login_type" SMALLINT NOT NULL,
    "provider" VARCHAR(64) NOT NULL DEFAULT 'local',
    "ip" VARCHAR(64),
    "location" VARCHAR(128),
    "user_agent" TEXT,
    "browser" VARCHAR(64),
    "os" VARCHAR(64),
    "device" VARCHAR(64),
    "status" SMALLINT NOT NULL,
    "failure_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "username" VARCHAR(128),
    "module" VARCHAR(64),
    "action" VARCHAR(64),
    "description" VARCHAR(255),
    "method" VARCHAR(16),
    "path" VARCHAR(255),
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "request_id" VARCHAR(64),
    "request_params" JSONB,
    "request_body" JSONB,
    "status_code" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_dept_id_idx" ON "users"("dept_id");

-- CreateIndex
CREATE INDEX "users_deleted_id_status_created_at_idx" ON "users"("deleted_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_deleted_id_key" ON "users"("username", "deleted_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_deleted_id_key" ON "users"("email", "deleted_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_deleted_id_key" ON "users"("phone", "deleted_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials"("user_id");

-- CreateIndex
CREATE INDEX "user_credentials_locked_until_idx" ON "user_credentials"("locked_until");

-- CreateIndex
CREATE INDEX "auth_providers_type_idx" ON "auth_providers"("type");

-- CreateIndex
CREATE INDEX "auth_providers_status_idx" ON "auth_providers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_code_key" ON "auth_providers"("code");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE INDEX "user_identities_provider_id_idx" ON "user_identities"("provider_id");

-- CreateIndex
CREATE INDEX "user_identities_deleted_id_idx" ON "user_identities"("deleted_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_id_provider_subject_deleted_id_key" ON "user_identities"("provider_id", "provider_subject", "deleted_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_user_id_provider_id_deleted_id_key" ON "user_identities"("user_id", "provider_id", "deleted_id");

-- CreateIndex
CREATE INDEX "depts_parent_id_sort_idx" ON "depts"("parent_id", "sort");

-- CreateIndex
CREATE INDEX "depts_deleted_id_parent_id_sort_idx" ON "depts"("deleted_id", "parent_id", "sort");

-- CreateIndex
CREATE INDEX "depts_deleted_id_status_idx" ON "depts"("deleted_id", "status");

-- CreateIndex
CREATE INDEX "depts_sort_idx" ON "depts"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "depts_code_deleted_id_key" ON "depts"("code", "deleted_id");

-- CreateIndex
CREATE INDEX "roles_deleted_id_status_sort_idx" ON "roles"("deleted_id", "status", "sort");

-- CreateIndex
CREATE INDEX "roles_sort_idx" ON "roles"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_deleted_id_key" ON "roles"("code", "deleted_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "menus_parent_id_sort_idx" ON "menus"("parent_id", "sort");

-- CreateIndex
CREATE INDEX "menus_active_menu_id_idx" ON "menus"("active_menu_id");

-- CreateIndex
CREATE INDEX "menus_type_idx" ON "menus"("type");

-- CreateIndex
CREATE INDEX "menus_deleted_id_parent_id_sort_idx" ON "menus"("deleted_id", "parent_id", "sort");

-- CreateIndex
CREATE INDEX "menus_deleted_id_status_sort_idx" ON "menus"("deleted_id", "status", "sort");

-- CreateIndex
CREATE INDEX "menus_sort_idx" ON "menus"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "menus_name_deleted_id_key" ON "menus"("name", "deleted_id");

-- CreateIndex
CREATE INDEX "role_menus_menu_id_idx" ON "role_menus"("menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_menus_role_id_menu_id_key" ON "role_menus"("role_id", "menu_id");

-- CreateIndex
CREATE INDEX "permissions_type_idx" ON "permissions"("type");

-- CreateIndex
CREATE INDEX "permissions_module_action_idx" ON "permissions"("module", "action");

-- CreateIndex
CREATE INDEX "permissions_menu_id_idx" ON "permissions"("menu_id");

-- CreateIndex
CREATE INDEX "permissions_deleted_id_type_idx" ON "permissions"("deleted_id", "type");

-- CreateIndex
CREATE INDEX "permissions_deleted_id_status_idx" ON "permissions"("deleted_id", "status");

-- CreateIndex
CREATE INDEX "permissions_deleted_id_module_action_idx" ON "permissions"("deleted_id", "module", "action");

-- CreateIndex
CREATE INDEX "permissions_method_path_idx" ON "permissions"("method", "path");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_deleted_id_key" ON "permissions"("code", "deleted_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "role_depts_dept_id_idx" ON "role_depts"("dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_depts_role_id_dept_id_key" ON "role_depts"("role_id", "dept_id");

-- CreateIndex
CREATE INDEX "dict_types_deleted_id_status_idx" ON "dict_types"("deleted_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dict_types_code_deleted_id_key" ON "dict_types"("code", "deleted_id");

-- CreateIndex
CREATE INDEX "dict_items_dict_type_id_deleted_id_status_sort_idx" ON "dict_items"("dict_type_id", "deleted_id", "status", "sort");

-- CreateIndex
CREATE INDEX "dict_items_sort_idx" ON "dict_items"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "dict_items_dict_type_id_value_deleted_id_key" ON "dict_items"("dict_type_id", "value", "deleted_id");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_status_idx" ON "auth_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_last_active_at_idx" ON "auth_sessions"("last_active_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_revoked_at_idx" ON "refresh_tokens"("session_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "login_logs_user_id_created_at_idx" ON "login_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "login_logs_username_created_at_idx" ON "login_logs"("username", "created_at");

-- CreateIndex
CREATE INDEX "login_logs_status_created_at_idx" ON "login_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "login_logs_ip_created_at_idx" ON "login_logs"("ip", "created_at");

-- CreateIndex
CREATE INDEX "login_logs_created_at_idx" ON "login_logs"("created_at");

-- CreateIndex
CREATE INDEX "operation_logs_user_id_created_at_idx" ON "operation_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_action_idx" ON "operation_logs"("action");

-- CreateIndex
CREATE INDEX "operation_logs_module_action_idx" ON "operation_logs"("module", "action");

-- CreateIndex
CREATE INDEX "operation_logs_success_created_at_idx" ON "operation_logs"("success", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_request_id_idx" ON "operation_logs"("request_id");

-- CreateIndex
CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs"("created_at");
