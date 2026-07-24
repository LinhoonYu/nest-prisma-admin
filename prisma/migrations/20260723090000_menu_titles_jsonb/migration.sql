-- 新增 titles JSONB 列
ALTER TABLE "menus" ADD COLUMN "titles" JSONB;

-- 将现有 title 值迁移到 titles
UPDATE "menus" SET "titles" = jsonb_build_object('zh-cn', "title");

-- 设置非空约束
ALTER TABLE "menus" ALTER COLUMN "titles" SET NOT NULL;

-- 删除旧 title 列
ALTER TABLE "menus" DROP COLUMN "title";
