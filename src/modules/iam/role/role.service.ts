import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  AssignMenusDto,
  AssignPermissionsDto,
  CreateRoleDto,
  RoleQueryDto,
  UpdateRoleDto,
} from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async list(query: RoleQueryDto) {
    const { page, pageSize, name, code, status } = query;
    const where = {
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(code && { code: { contains: code, mode: 'insensitive' as const } }),
      ...(status !== undefined && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sort: 'asc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        roleMenus: { select: { menuId: true } },
        rolePermissions: { select: { permissionId: true } },
      },
    });
    if (!role) throw new ApiException(ApiCode.RoleNotFound, '角色不存在');

    const { roleMenus, rolePermissions, ...rest } = role;
    return {
      ...rest,
      menuIds: roleMenus.map((rm) => rm.menuId),
      permissionIds: rolePermissions.map((rp) => rp.permissionId),
    };
  }

  async create(dto: CreateRoleDto, operatorId: bigint) {
    const exists = await this.prisma.role.findFirst({
      where: { code: dto.code },
      select: { id: true },
    });
    if (exists) throw new ApiException(ApiCode.BadRequest, '角色编码已存在');

    return this.prisma.role.create({
      data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
    });
  }

  async update(id: bigint, dto: UpdateRoleDto, operatorId: bigint) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new ApiException(ApiCode.RoleNotFound, '角色不存在');
    if (role.isSystem) {
      throw new ApiException(ApiCode.BadRequest, '系统内置角色不可修改');
    }

    if (dto.code !== undefined && dto.code !== role.code) {
      const exists = await this.prisma.role.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (exists) throw new ApiException(ApiCode.BadRequest, '角色编码已存在');
    }

    return this.prisma.role.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });
  }

  async remove(id: bigint, operatorId: bigint) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new ApiException(ApiCode.RoleNotFound, '角色不存在');
    if (role.isSystem) {
      throw new ApiException(ApiCode.BadRequest, '系统内置角色不可删除');
    }

    const userCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });
    if (userCount > 0) {
      throw new ApiException(ApiCode.BadRequest, '角色下存在用户，无法删除');
    }

    await this.prisma.$transaction([
      // 关联表不在软删除模型列表中，以下均为物理删除
      this.prisma.roleMenu.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.role.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedId: id,
          deletedBy: operatorId,
        },
      }),
    ]);
  }

  async assignMenus(id: bigint, dto: AssignMenusDto, operatorId: bigint) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new ApiException(ApiCode.RoleNotFound, '角色不存在');
    if (role.isSystem) {
      throw new ApiException(ApiCode.BadRequest, '系统内置角色不可分配菜单');
    }

    const menuIds = dto.menuIds.map((mid) => BigInt(mid));

    if (menuIds.length > 0) {
      const validCount = await this.prisma.menu.count({
        where: { id: { in: menuIds } },
      });
      if (validCount !== menuIds.length) {
        throw new ApiException(ApiCode.BadRequest, '部分菜单不存在');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      if (menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: menuIds.map((menuId) => ({
            roleId: id,
            menuId,
            createdBy: operatorId,
          })),
        });
      }
    });
  }

  async assignPermissions(
    id: bigint,
    dto: AssignPermissionsDto,
    operatorId: bigint,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new ApiException(ApiCode.RoleNotFound, '角色不存在');
    if (role.isSystem) {
      throw new ApiException(ApiCode.BadRequest, '系统内置角色不可分配权限');
    }

    const permissionIds = dto.permissionIds.map((pid) => BigInt(pid));

    if (permissionIds.length > 0) {
      const validCount = await this.prisma.permission.count({
        where: { id: { in: permissionIds } },
      });
      if (validCount !== permissionIds.length) {
        throw new ApiException(ApiCode.BadRequest, '部分权限不存在');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
            createdBy: operatorId,
          })),
        });
      }
    });
  }
}
