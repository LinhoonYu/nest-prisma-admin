-- AlterTable
ALTER TABLE "menus" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;

-- 将已有 seed 菜单标记为系统数据
UPDATE "menus" SET "is_system" = true WHERE "name" IN (
  'System', 'User', 'Role', 'SysMenu', 'Permission', 'Dept',
  'App', 'Dict', 'Notice', 'Config',
  'Log', 'LoginLog', 'OperationLog'
);
