import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const MENU_DIR = 1;
const MENU_PAGE = 2;

interface MenuSeed {
  name: string;
  title: string;
  path: string;
  component?: string;
  redirect?: string;
  icon?: string;
  type: number;
  sort: number;
  children?: MenuSeed[];
}

const menuTree: MenuSeed[] = [
  {
    name: 'System',
    title: '系统管理',
    path: '/system',
    icon: 'system',
    type: MENU_DIR,
    sort: 10,
    children: [
      {
        name: 'User',
        title: '用户管理',
        path: 'user',
        component: 'system/user/index',
        icon: 'el-icon-User',
        type: MENU_PAGE,
        sort: 1,
      },
      {
        name: 'Role',
        title: '角色管理',
        path: 'role',
        component: 'system/role/index',
        icon: 'role',
        type: MENU_PAGE,
        sort: 2,
      },
      {
        name: 'SysMenu',
        title: '菜单管理',
        path: 'menu',
        component: 'system/menu/index',
        icon: 'menu',
        type: MENU_PAGE,
        sort: 3,
      },
      {
        name: 'Permission',
        title: '权限管理',
        path: 'permission',
        component: 'system/permission/index',
        icon: 'el-icon-Lock',
        type: MENU_PAGE,
        sort: 4,
      },
      {
        name: 'Dept',
        title: '部门管理',
        path: 'dept',
        component: 'system/dept/index',
        icon: 'tree',
        type: MENU_PAGE,
        sort: 5,
      },
    ],
  },
  {
    name: 'App',
    title: '应用设置',
    path: '/app',
    icon: 'setting',
    type: MENU_DIR,
    sort: 20,
    children: [
      {
        name: 'Dict',
        title: '字典管理',
        path: 'dict',
        component: 'system/dict/index',
        icon: 'el-icon-Notebook',
        type: MENU_PAGE,
        sort: 1,
      },
      {
        name: 'Notice',
        title: '通知管理',
        path: 'notice',
        component: 'system/notice/index',
        icon: 'el-icon-Bell',
        type: MENU_PAGE,
        sort: 2,
      },
      {
        name: 'Config',
        title: '系统设置',
        path: 'config',
        component: 'system/config/index',
        icon: 'el-icon-Setting',
        type: MENU_PAGE,
        sort: 3,
      },
    ],
  },
  {
    name: 'Log',
    title: '日志中心',
    path: '/log',
    icon: 'document',
    type: MENU_DIR,
    sort: 30,
    children: [
      {
        name: 'LoginLog',
        title: '登录日志',
        path: 'login-log',
        component: 'system/login-log/index',
        icon: 'el-icon-Document',
        type: MENU_PAGE,
        sort: 1,
      },
      {
        name: 'OperationLog',
        title: '操作日志',
        path: 'operation-log',
        component: 'system/operation-log/index',
        icon: 'el-icon-DocumentCopy',
        type: MENU_PAGE,
        sort: 2,
      },
    ],
  },
];

interface PermSeed {
  code: string;
  name: string;
  group: string;
  method: string;
  path: string;
  sort: number;
}

const permissions: PermSeed[] = [
  // 用户管理
  {
    code: 'iam:user:list',
    name: '用户列表',
    group: '用户管理',
    method: 'GET',
    path: '/api/v1/users',
    sort: 10,
  },
  {
    code: 'iam:user:create',
    name: '新增用户',
    group: '用户管理',
    method: 'POST',
    path: '/api/v1/users',
    sort: 11,
  },
  {
    code: 'iam:user:read',
    name: '用户详情',
    group: '用户管理',
    method: 'GET',
    path: '/api/v1/users/:id',
    sort: 12,
  },
  {
    code: 'iam:user:update',
    name: '修改用户',
    group: '用户管理',
    method: 'PUT',
    path: '/api/v1/users/:id',
    sort: 13,
  },
  {
    code: 'iam:user:delete',
    name: '删除用户',
    group: '用户管理',
    method: 'DELETE',
    path: '/api/v1/users/:id',
    sort: 14,
  },
  {
    code: 'iam:user:assign-roles',
    name: '分配角色',
    group: '用户管理',
    method: 'PUT',
    path: '/api/v1/users/:id/roles',
    sort: 15,
  },
  {
    code: 'iam:user:assign-scope',
    name: '设置数据范围',
    group: '用户管理',
    method: 'PUT',
    path: '/api/v1/users/:id/data-scope',
    sort: 16,
  },
  {
    code: 'iam:user:reset-password',
    name: '重置密码',
    group: '用户管理',
    method: 'PUT',
    path: '/api/v1/users/:id/password',
    sort: 17,
  },

  // 角色管理
  {
    code: 'iam:role:list',
    name: '角色列表',
    group: '角色管理',
    method: 'GET',
    path: '/api/v1/roles',
    sort: 20,
  },
  {
    code: 'iam:role:create',
    name: '新增角色',
    group: '角色管理',
    method: 'POST',
    path: '/api/v1/roles',
    sort: 21,
  },
  {
    code: 'iam:role:read',
    name: '角色详情',
    group: '角色管理',
    method: 'GET',
    path: '/api/v1/roles/:id',
    sort: 22,
  },
  {
    code: 'iam:role:update',
    name: '修改角色',
    group: '角色管理',
    method: 'PUT',
    path: '/api/v1/roles/:id',
    sort: 23,
  },
  {
    code: 'iam:role:delete',
    name: '删除角色',
    group: '角色管理',
    method: 'DELETE',
    path: '/api/v1/roles/:id',
    sort: 24,
  },
  {
    code: 'iam:role:assign-menus',
    name: '分配菜单',
    group: '角色管理',
    method: 'PUT',
    path: '/api/v1/roles/:id/menus',
    sort: 25,
  },
  {
    code: 'iam:role:assign-perms',
    name: '分配权限',
    group: '角色管理',
    method: 'PUT',
    path: '/api/v1/roles/:id/permissions',
    sort: 26,
  },

  // 菜单管理
  {
    code: 'iam:menu:list',
    name: '菜单列表',
    group: '菜单管理',
    method: 'GET',
    path: '/api/v1/menus',
    sort: 30,
  },
  {
    code: 'iam:menu:create',
    name: '新增菜单',
    group: '菜单管理',
    method: 'POST',
    path: '/api/v1/menus',
    sort: 31,
  },
  {
    code: 'iam:menu:read',
    name: '菜单详情',
    group: '菜单管理',
    method: 'GET',
    path: '/api/v1/menus/:id',
    sort: 32,
  },
  {
    code: 'iam:menu:update',
    name: '修改菜单',
    group: '菜单管理',
    method: 'PUT',
    path: '/api/v1/menus/:id',
    sort: 33,
  },
  {
    code: 'iam:menu:delete',
    name: '删除菜单',
    group: '菜单管理',
    method: 'DELETE',
    path: '/api/v1/menus/:id',
    sort: 34,
  },

  // 权限管理
  {
    code: 'iam:permission:list',
    name: '权限列表',
    group: '权限管理',
    method: 'GET',
    path: '/api/v1/permissions',
    sort: 40,
  },
  {
    code: 'iam:permission:create',
    name: '新增权限',
    group: '权限管理',
    method: 'POST',
    path: '/api/v1/permissions',
    sort: 41,
  },
  {
    code: 'iam:permission:read',
    name: '权限详情',
    group: '权限管理',
    method: 'GET',
    path: '/api/v1/permissions/:id',
    sort: 42,
  },
  {
    code: 'iam:permission:update',
    name: '修改权限',
    group: '权限管理',
    method: 'PUT',
    path: '/api/v1/permissions/:id',
    sort: 43,
  },
  {
    code: 'iam:permission:delete',
    name: '删除权限',
    group: '权限管理',
    method: 'DELETE',
    path: '/api/v1/permissions/:id',
    sort: 44,
  },

  // 部门管理
  {
    code: 'iam:dept:list',
    name: '部门列表',
    group: '部门管理',
    method: 'GET',
    path: '/api/v1/depts',
    sort: 50,
  },
  {
    code: 'iam:dept:create',
    name: '新增部门',
    group: '部门管理',
    method: 'POST',
    path: '/api/v1/depts',
    sort: 51,
  },
  {
    code: 'iam:dept:read',
    name: '部门详情',
    group: '部门管理',
    method: 'GET',
    path: '/api/v1/depts/:id',
    sort: 52,
  },
  {
    code: 'iam:dept:update',
    name: '修改部门',
    group: '部门管理',
    method: 'PUT',
    path: '/api/v1/depts/:id',
    sort: 53,
  },
  {
    code: 'iam:dept:delete',
    name: '删除部门',
    group: '部门管理',
    method: 'DELETE',
    path: '/api/v1/depts/:id',
    sort: 54,
  },

  // 字典类型
  {
    code: 'dict:type:list',
    name: '字典类型列表',
    group: '字典管理',
    method: 'GET',
    path: '/api/v1/dict-types',
    sort: 60,
  },
  {
    code: 'dict:type:create',
    name: '新增字典类型',
    group: '字典管理',
    method: 'POST',
    path: '/api/v1/dict-types',
    sort: 61,
  },
  {
    code: 'dict:type:read',
    name: '字典类型详情',
    group: '字典管理',
    method: 'GET',
    path: '/api/v1/dict-types/:id',
    sort: 62,
  },
  {
    code: 'dict:type:update',
    name: '修改字典类型',
    group: '字典管理',
    method: 'PUT',
    path: '/api/v1/dict-types/:id',
    sort: 63,
  },
  {
    code: 'dict:type:delete',
    name: '删除字典类型',
    group: '字典管理',
    method: 'DELETE',
    path: '/api/v1/dict-types/:id',
    sort: 64,
  },

  // 字典项
  {
    code: 'dict:item:list',
    name: '字典项列表',
    group: '字典管理',
    method: 'GET',
    path: '/api/v1/dict-items',
    sort: 65,
  },
  {
    code: 'dict:item:create',
    name: '新增字典项',
    group: '字典管理',
    method: 'POST',
    path: '/api/v1/dict-items',
    sort: 66,
  },
  {
    code: 'dict:item:read',
    name: '字典项详情',
    group: '字典管理',
    method: 'GET',
    path: '/api/v1/dict-items/:id',
    sort: 67,
  },
  {
    code: 'dict:item:update',
    name: '修改字典项',
    group: '字典管理',
    method: 'PUT',
    path: '/api/v1/dict-items/:id',
    sort: 68,
  },
  {
    code: 'dict:item:delete',
    name: '删除字典项',
    group: '字典管理',
    method: 'DELETE',
    path: '/api/v1/dict-items/:id',
    sort: 69,
  },

  // 文件管理
  {
    code: 'file:upload',
    name: '上传文件',
    group: '文件管理',
    method: 'POST',
    path: '/api/v1/files',
    sort: 70,
  },
  {
    code: 'file:read',
    name: '查看文件',
    group: '文件管理',
    method: 'GET',
    path: '/api/v1/files/:id',
    sort: 71,
  },
  {
    code: 'file:delete',
    name: '删除文件',
    group: '文件管理',
    method: 'DELETE',
    path: '/api/v1/files/:id',
    sort: 72,
  },

  // 通知管理
  {
    code: 'sys:notice:list',
    name: '通知列表',
    group: '通知管理',
    method: 'GET',
    path: '/api/v1/notices',
    sort: 80,
  },
  {
    code: 'sys:notice:create',
    name: '新增通知',
    group: '通知管理',
    method: 'POST',
    path: '/api/v1/notices',
    sort: 81,
  },
  {
    code: 'sys:notice:read',
    name: '通知详情',
    group: '通知管理',
    method: 'GET',
    path: '/api/v1/notices/:id',
    sort: 82,
  },
  {
    code: 'sys:notice:update',
    name: '修改通知',
    group: '通知管理',
    method: 'PUT',
    path: '/api/v1/notices/:id',
    sort: 83,
  },
  {
    code: 'sys:notice:delete',
    name: '删除通知',
    group: '通知管理',
    method: 'DELETE',
    path: '/api/v1/notices/:id',
    sort: 84,
  },
  {
    code: 'sys:notice:publish',
    name: '发布通知',
    group: '通知管理',
    method: 'PUT',
    path: '/api/v1/notices/:id/publish',
    sort: 85,
  },
  {
    code: 'sys:notice:revoke',
    name: '撤回通知',
    group: '通知管理',
    method: 'PUT',
    path: '/api/v1/notices/:id/revoke',
    sort: 86,
  },

  // 登录日志
  {
    code: 'log:login:list',
    name: '登录日志列表',
    group: '日志管理',
    method: 'GET',
    path: '/api/v1/login-logs',
    sort: 90,
  },
  {
    code: 'log:login:read',
    name: '登录日志详情',
    group: '日志管理',
    method: 'GET',
    path: '/api/v1/login-logs/:id',
    sort: 91,
  },
  {
    code: 'log:login:delete',
    name: '删除登录日志',
    group: '日志管理',
    method: 'DELETE',
    path: '/api/v1/login-logs/:id',
    sort: 92,
  },

  // 操作日志
  {
    code: 'log:operation:list',
    name: '操作日志列表',
    group: '日志管理',
    method: 'GET',
    path: '/api/v1/operation-logs',
    sort: 93,
  },
  {
    code: 'log:operation:read',
    name: '操作日志详情',
    group: '日志管理',
    method: 'GET',
    path: '/api/v1/operation-logs/:id',
    sort: 94,
  },
  {
    code: 'log:operation:delete',
    name: '删除操作日志',
    group: '日志管理',
    method: 'DELETE',
    path: '/api/v1/operation-logs/:id',
    sort: 95,
  },

  // 系统配置
  {
    code: 'sys:config:list',
    name: '配置列表',
    group: '配置管理',
    method: 'GET',
    path: '/api/v1/configs',
    sort: 100,
  },
  {
    code: 'sys:config:create',
    name: '新增配置',
    group: '配置管理',
    method: 'POST',
    path: '/api/v1/configs',
    sort: 101,
  },
  {
    code: 'sys:config:read',
    name: '配置详情',
    group: '配置管理',
    method: 'GET',
    path: '/api/v1/configs/:id',
    sort: 102,
  },
  {
    code: 'sys:config:update',
    name: '修改配置',
    group: '配置管理',
    method: 'PUT',
    path: '/api/v1/configs/:id',
    sort: 103,
  },
  {
    code: 'sys:config:delete',
    name: '删除配置',
    group: '配置管理',
    method: 'DELETE',
    path: '/api/v1/configs/:id',
    sort: 104,
  },
  {
    code: 'sys:config:refresh',
    name: '刷新配置缓存',
    group: '配置管理',
    method: 'PUT',
    path: '/api/v1/configs/refresh',
    sort: 105,
  },
];

interface DictTypeSeed {
  code: string;
  name: string;
  items: DictItemSeed[];
}

interface DictItemSeed {
  label: string;
  value: string;
  color?: string;
  sort: number;
  isDefault?: boolean;
}

const dictTypes: DictTypeSeed[] = [
  {
    code: 'gender',
    name: '性别',
    items: [
      { label: '未知', value: '0', color: 'info', sort: 1, isDefault: true },
      { label: '男', value: '1', color: 'primary', sort: 2 },
      { label: '女', value: '2', color: 'danger', sort: 3 },
    ],
  },
  {
    code: 'notice_type',
    name: '通知类型',
    items: [
      { label: '通知', value: '0', color: 'primary', sort: 1, isDefault: true },
      { label: '公告', value: '1', color: 'success', sort: 2 },
    ],
  },
  {
    code: 'notice_level',
    name: '通知等级',
    items: [
      { label: '低', value: 'L', color: 'info', sort: 1, isDefault: true },
      { label: '中', value: 'M', color: 'warning', sort: 2 },
      { label: '高', value: 'H', color: 'danger', sort: 3 },
    ],
  },
];

async function createMenus(
  tx: Prisma.TransactionClient,
  items: MenuSeed[],
  parentId?: bigint,
): Promise<bigint[]> {
  const ids: bigint[] = [];

  for (const item of items) {
    const baseData = {
      parentId: parentId ?? null,
      type: item.type,
      title: item.title,
      path: item.path,
      component: item.component ?? null,
      redirect: item.redirect ?? null,
      icon: item.icon ?? null,
      sort: item.sort,
      status: 1,
    };

    const menu = await tx.menu.upsert({
      where: { name_deletedId: { name: item.name, deletedId: 0n } },
      update: baseData,
      create: { ...baseData, name: item.name },
    });

    ids.push(menu.id);

    if (item.children?.length) {
      const childIds = await createMenus(tx, item.children, menu.id);
      ids.push(...childIds);
    }
  }

  return ids;
}

const authProviders = [
  {
    code: 'google',
    name: 'Google',
    type: 1,
    issuer: 'https://accounts.google.com',
  },
  { code: 'github', name: 'GitHub', type: 1, issuer: 'https://github.com' },
  { code: 'gitee', name: 'Gitee', type: 1, issuer: 'https://gitee.com' },
];

async function main() {
  const username = 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  await prisma.$transaction(
    async (tx) => {
      // 1. 创建管理员用户
      const user = await tx.user.upsert({
        where: { username_deletedId: { username, deletedId: 0n } },
        update: {},
        create: {
          username,
          nickname: '超级管理员',
          isSuperAdmin: true,
          status: 1,
          dataScope: 1,
        },
      });

      // 仅首次创建时写入密码，不覆盖已有密码
      const existingCredential = await tx.userCredential.findUnique({
        where: { userId: user.id },
        select: { userId: true },
      });

      if (!existingCredential) {
        await tx.userCredential.create({
          data: {
            userId: user.id,
            passwordHash: await bcrypt.hash(password, 10),
            passwordAlgo: 'bcrypt',
          },
        });
      }

      // 2. 创建菜单
      const menuIds = await createMenus(tx, menuTree);

      // 3. 创建权限
      const permIds: bigint[] = [];
      for (const perm of permissions) {
        const baseData = {
          name: perm.name,
          group: perm.group,
          method: perm.method,
          path: perm.path,
          sort: perm.sort,
          status: 1,
          isSystem: true,
        };

        const result = await tx.permission.upsert({
          where: { code_deletedId: { code: perm.code, deletedId: 0n } },
          update: baseData,
          create: { ...baseData, code: perm.code },
        });
        permIds.push(result.id);
      }

      // 4. 创建默认角色
      const role = await tx.role.upsert({
        where: { code_deletedId: { code: 'ADMIN', deletedId: 0n } },
        update: { name: '管理员', sort: 1, status: 1, isSystem: true },
        create: {
          code: 'ADMIN',
          name: '管理员',
          sort: 1,
          status: 1,
          isSystem: true,
          remark: '默认管理员角色',
        },
      });

      // 5. 角色-菜单关联
      await tx.roleMenu.createMany({
        data: menuIds.map((menuId) => ({ roleId: role.id, menuId })),
        skipDuplicates: true,
      });

      // 6. 角色-权限关联
      await tx.rolePermission.createMany({
        data: permIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });

      // 7. 用户-角色关联
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });

      // 8. 创建字典类型和字典项
      let dictTypeCount = 0;
      let dictItemCount = 0;

      for (const dt of dictTypes) {
        const typeData = {
          code: dt.code,
          name: dt.name,
          status: 1,
          isSystem: true,
        };

        const dictType = await tx.dictType.upsert({
          where: { code_deletedId: { code: dt.code, deletedId: 0n } },
          update: typeData,
          create: typeData,
        });
        dictTypeCount++;

        for (const item of dt.items) {
          const itemData = {
            dictTypeId: dictType.id,
            label: item.label,
            value: item.value,
            color: item.color ?? null,
            sort: item.sort,
            status: 1,
            isDefault: item.isDefault ?? false,
          };

          await tx.dictItem.upsert({
            where: {
              dictTypeId_value_deletedId: {
                dictTypeId: dictType.id,
                value: item.value,
                deletedId: 0n,
              },
            },
            update: itemData,
            create: itemData,
          });
          dictItemCount++;
        }
      }

      // 9. 创建 OAuth 提供商
      for (const p of authProviders) {
        await tx.authProvider.upsert({
          where: { code: p.code },
          update: { name: p.name, type: p.type, issuer: p.issuer, status: 1 },
          create: { ...p, status: 1 },
        });
      }

      console.log(
        `Seed completed: user=${user.username}, role=${role.code}, menus=${menuIds.length}, permissions=${permIds.length}, dictTypes=${dictTypeCount}, dictItems=${dictItemCount}, authProviders=${authProviders.length}`,
      );
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
