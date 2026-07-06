import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { buildTree } from '~/common/utils/build-tree';
import { DataScopeService } from '~/modules/auth/data-scope.service';
import { PrismaService } from '~/shared/prisma/prisma.service';

import { CreateDeptDto, DeptQueryDto, UpdateDeptDto } from './dto/dept.dto';

/** 树形接口结果集上限，防止脏数据导致一次性拉全表 */
const MAX_TREE_NODES = 5000;

@Injectable()
export class DeptService {
  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
  ) {}

  async tree(query?: DeptQueryDto) {
    // 部门通常量不大，但仍加结果集上限保护，避免脏数据导致一次性拉全表
    const list = await this.prisma.dept.findMany({
      where: {
        ...(query?.name && {
          name: { contains: query.name, mode: 'insensitive' },
        }),
        ...(query?.code && {
          code: { contains: query.code, mode: 'insensitive' },
        }),
        ...(query?.status !== undefined && { status: query.status }),
      },
      orderBy: { sort: 'asc' },
      take: MAX_TREE_NODES,
    });
    return buildTree(list, { sortKey: 'sort' });
  }

  async detail(id: bigint) {
    const dept = await this.prisma.dept.findUnique({ where: { id } });
    if (!dept) throw new ApiException(ApiCode.DeptNotFound, '部门不存在');
    return dept;
  }

  async create(dto: CreateDeptDto, operatorId: bigint) {
    if (dto.parentId) {
      const parent = await this.prisma.dept.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new ApiException(ApiCode.DeptNotFound, '父部门不存在');
    }

    const exists = await this.prisma.dept.findFirst({
      where: { code: dto.code },
      select: { id: true },
    });
    if (exists) throw new ApiException(ApiCode.BadRequest, '部门编码已存在');

    const result = await this.prisma.dept.create({
      data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
    });

    this.dataScopeService.invalidateDeptTree().catch(() => undefined);
    return result;
  }

  async update(id: bigint, dto: UpdateDeptDto, operatorId: bigint) {
    const dept = await this.prisma.dept.findUnique({ where: { id } });
    if (!dept) throw new ApiException(ApiCode.DeptNotFound, '部门不存在');

    // parentId 变更：null=清空父级，bigint=设新父级
    if (dto.parentId !== undefined && dto.parentId !== dept.parentId) {
      if (dto.parentId === null) {
        // 清空父级，无需额外校验
      } else {
        if (dto.parentId === id) {
          throw new ApiException(ApiCode.BadRequest, '不能将自身设为父部门');
        }
        const parent = await this.prisma.dept.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent)
          throw new ApiException(ApiCode.DeptNotFound, '父部门不存在');
        // 递归检查祖先，防止形成循环引用
        await this.assertNoCycle(id, dto.parentId);
      }
    }

    if (dto.code !== undefined && dto.code !== dept.code) {
      const exists = await this.prisma.dept.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (exists) throw new ApiException(ApiCode.BadRequest, '部门编码已存在');
    }

    const result = await this.prisma.dept.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });

    this.dataScopeService.invalidateDeptTree().catch(() => undefined);
    return result;
  }

  async remove(id: bigint, operatorId: bigint) {
    const dept = await this.prisma.dept.findUnique({ where: { id } });
    if (!dept) throw new ApiException(ApiCode.DeptNotFound, '部门不存在');

    const childCount = await this.prisma.dept.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ApiException(ApiCode.BadRequest, '存在子部门，无法删除');
    }

    const userCount = await this.prisma.user.count({ where: { deptId: id } });
    if (userCount > 0) {
      throw new ApiException(ApiCode.BadRequest, '部门下存在用户，无法删除');
    }

    await this.prisma.$transaction([
      this.prisma.userDataScopeDept.deleteMany({ where: { deptId: id } }),
      this.prisma.dept.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedId: id,
          deletedBy: operatorId,
        },
      }),
    ]);

    this.dataScopeService.invalidateDeptTree().catch(() => undefined);
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
          '不能将该部门设为子级，会形成循环引用',
        );
      }
      if (visited.has(currentId)) break; // 防御已存在的环
      visited.add(currentId);
      const node: { parentId: bigint | null } | null =
        await this.prisma.dept.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = node?.parentId ?? null;
    }
  }
}
