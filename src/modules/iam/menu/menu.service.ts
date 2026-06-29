import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { buildTree } from '~/common/utils/build-tree';
import { PrismaService } from '~/shared/prisma/prisma.service';

import { CreateMenuDto, MenuQueryDto, UpdateMenuDto } from './dto/menu.dto';

/** 树形接口结果集上限，防止脏数据导致一次性拉全表 */
const MAX_TREE_NODES = 5000;

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async tree(query?: MenuQueryDto) {
    // 菜单通常量不大，但仍加结果集上限保护，避免脏数据导致全表拉取
    const list = await this.prisma.menu.findMany({
      where: {
        ...(query?.title && {
          title: { contains: query.title, mode: 'insensitive' },
        }),
        ...(query?.type !== undefined && { type: query.type }),
        ...(query?.status !== undefined && { status: query.status }),
      },
      orderBy: { sort: 'asc' },
      take: MAX_TREE_NODES,
    });
    return buildTree(list, { sortKey: 'sort' });
  }

  async detail(id: bigint) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new ApiException(ApiCode.MenuNotFound, '菜单不存在');
    return menu;
  }

  async create(dto: CreateMenuDto, operatorId: bigint) {
    if (dto.parentId) {
      const parent = await this.prisma.menu.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new ApiException(ApiCode.MenuNotFound, '父菜单不存在');
    }

    const exists = await this.prisma.menu.findFirst({
      where: { name: dto.name },
      select: { id: true },
    });
    if (exists) throw new ApiException(ApiCode.BadRequest, '路由名称已存在');

    return this.prisma.menu.create({
      data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
    });
  }

  async update(id: bigint, dto: UpdateMenuDto, operatorId: bigint) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new ApiException(ApiCode.MenuNotFound, '菜单不存在');

    // parentId 变更：null=清空父级，bigint=设新父级
    if (dto.parentId !== undefined && dto.parentId !== menu.parentId) {
      if (dto.parentId === null) {
        // 清空父级，无需额外校验
      } else {
        if (dto.parentId === id) {
          throw new ApiException(ApiCode.BadRequest, '不能将自身设为父菜单');
        }
        const parent = await this.prisma.menu.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent)
          throw new ApiException(ApiCode.MenuNotFound, '父菜单不存在');
        // 递归检查祖先，防止形成循环引用
        await this.assertNoCycle(id, dto.parentId);
      }
    }

    if (dto.name !== undefined && dto.name !== menu.name) {
      const exists = await this.prisma.menu.findFirst({
        where: { name: dto.name, NOT: { id } },
        select: { id: true },
      });
      if (exists) throw new ApiException(ApiCode.BadRequest, '路由名称已存在');
    }

    return this.prisma.menu.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });
  }

  async remove(id: bigint, operatorId: bigint) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new ApiException(ApiCode.MenuNotFound, '菜单不存在');

    const childCount = await this.prisma.menu.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ApiException(ApiCode.BadRequest, '存在子菜单，无法删除');
    }

    await this.prisma.$transaction([
      // 关联表不在软删除模型列表中，此处为物理删除
      this.prisma.roleMenu.deleteMany({ where: { menuId: id } }),
      this.prisma.menu.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedId: id,
          deletedBy: operatorId,
        },
      }),
    ]);
  }

  /**
   * 递归检查将 newParentId 设为 id 的父级后是否会产生循环引用。
   * 沿 newParentId 的 parentId 链向上遍历，若遇到 id 则说明会形成环。
   */
  private async assertNoCycle(id: bigint, newParentId: bigint): Promise<void> {
    let currentId: bigint | null = newParentId;
    const visited = new Set<bigint>();
    while (currentId !== null) {
      if (currentId === id) {
        throw new ApiException(
          ApiCode.BadRequest,
          '不能将该菜单设为子级，会形成循环引用',
        );
      }
      if (visited.has(currentId)) break; // 防御已存在的环
      visited.add(currentId);
      const node: { parentId: bigint | null } | null =
        await this.prisma.menu.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = node?.parentId ?? null;
    }
  }
}
