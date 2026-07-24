import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { type Prisma } from '~/generated/prisma/client';
import { AppLogger } from '~/common/logger/app-logger';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { type MenuSeed, menuTree, permissions, dictTypes } from './seed-data';

/**
 * 应用启动时自动检查并补齐系统基础数据
 *
 * 策略：不存在才创建，存在就不动
 * 确保用户在后台修改的数据不会被覆盖
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(BootstrapService.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const adminExists = await this.prisma.user.findFirst({
      where: { username: 'admin', deletedId: 0n },
      select: { id: true },
    });

    if (adminExists) {
      this.logger.info('System data already initialized, skipping bootstrap');
      return;
    }

    this.logger.info('Initializing system data...');
    await this.seed();
    this.logger.info('System data initialized');
  }

  private async seed(): Promise<void> {
    const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

    await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1. 创建管理员用户
        const user = await tx.user.upsert({
          where: { username_deletedId: { username: 'admin', deletedId: 0n } },
          update: {},
          create: {
            username: 'admin',
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

        // 2. 创建菜单（存在就跳过，不覆盖用户修改）
        const menuIds = await this.createMenus(tx, menuTree);

        // 3. 创建权限（存在就跳过）
        const permIds: bigint[] = [];
        for (const perm of permissions) {
          const result = await tx.permission.upsert({
            where: { code_deletedId: { code: perm.code, deletedId: 0n } },
            update: {},
            create: {
              code: perm.code,
              name: perm.name,
              group: perm.group,
              method: perm.method,
              path: perm.path,
              sort: perm.sort,
              status: 1,
              isSystem: true,
            },
          });
          permIds.push(result.id);
        }

        // 4. 创建默认角色（存在就跳过）
        const role = await tx.role.upsert({
          where: { code_deletedId: { code: 'ADMIN', deletedId: 0n } },
          update: {},
          create: {
            code: 'ADMIN',
            name: '管理员',
            sort: 1,
            status: 1,
            isSystem: true,
            remark: '默认管理员角色',
          },
        });

        // 5. 角色-菜单关联（skipDuplicates 确保幂等）
        await tx.roleMenu.createMany({
          data: menuIds.map((menuId) => ({ roleId: role.id, menuId })),
          skipDuplicates: true,
        });

        // 6. 角色-权限关联（skipDuplicates 确保幂等）
        await tx.rolePermission.createMany({
          data: permIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });

        // 7. 用户-角色关联（存在就跳过）
        await tx.userRole.upsert({
          where: {
            userId_roleId: { userId: user.id, roleId: role.id },
          },
          update: {},
          create: { userId: user.id, roleId: role.id },
        });

        // 8. 创建字典类型和字典项（存在就跳过）
        for (const dt of dictTypes) {
          const dictType = await tx.dictType.upsert({
            where: { code_deletedId: { code: dt.code, deletedId: 0n } },
            update: {},
            create: {
              code: dt.code,
              name: dt.name,
              status: 1,
              isSystem: true,
            },
          });

          for (const item of dt.items) {
            await tx.dictItem.upsert({
              where: {
                dictTypeId_value_deletedId: {
                  dictTypeId: dictType.id,
                  value: item.value,
                  deletedId: 0n,
                },
              },
              update: {},
              create: {
                dictTypeId: dictType.id,
                label: item.label,
                value: item.value,
                color: item.color ?? null,
                sort: item.sort,
                status: 1,
                isDefault: item.isDefault ?? false,
              },
            });
          }
        }
      },
      { timeout: 30000, maxWait: 10000 },
    );
  }

  /**
   * 递归创建菜单树，存在就跳过，不覆盖用户修改
   */
  private async createMenus(
    tx: Prisma.TransactionClient,
    items: MenuSeed[],
    parentId?: bigint,
  ): Promise<bigint[]> {
    const ids: bigint[] = [];

    for (const item of items) {
      const result = await tx.menu.upsert({
        where: { name_deletedId: { name: item.name, deletedId: 0n } },
        update: {},
        create: {
          parentId: parentId ?? null,
          name: item.name,
          type: item.type,
          titles: item.titles,
          path: item.path,
          component: item.component ?? null,
          redirect: item.redirect ?? null,
          icon: item.icon ?? null,
          sort: item.sort,
          status: 1,
          isSystem: true,
        },
      });

      ids.push(result.id);

      if (item.children?.length) {
        const childIds = await this.createMenus(tx, item.children, result.id);
        ids.push(...childIds);
      }
    }

    return ids;
  }
}
