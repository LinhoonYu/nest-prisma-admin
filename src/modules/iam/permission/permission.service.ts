import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  CreatePermissionDto,
  PermissionQueryDto,
  UpdatePermissionDto,
} from './dto/permission.dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async list(query: PermissionQueryDto) {
    const { page, pageSize, name, code, group, status } = query;
    const where = {
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(code && { code: { contains: code, mode: 'insensitive' as const } }),
      ...(group && { group }),
      ...(status !== undefined && { status }),
    };

    const noPage = pageSize === 0;

    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        ...(noPage ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        orderBy: { sort: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new ApiException(ApiCode.PermissionNotFound);
    return permission;
  }

  async create(dto: CreatePermissionDto, operatorId: bigint) {
    const exists = await this.prisma.permission.findFirst({
      where: { code: dto.code },
      select: { id: true },
    });
    if (exists) throw new ApiException(ApiCode.BadRequest);

    return this.prisma.permission.create({
      data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
    });
  }

  async update(id: bigint, dto: UpdatePermissionDto, operatorId: bigint) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new ApiException(ApiCode.PermissionNotFound);
    if (perm.isSystem) {
      const codeChanged = dto.code !== undefined && dto.code !== perm.code;
      const methodChanged =
        dto.method !== undefined && dto.method !== perm.method;
      const pathChanged = dto.path !== undefined && dto.path !== perm.path;
      if (codeChanged || methodChanged || pathChanged) {
        throw new ApiException(ApiCode.SystemDataCodeImmutable);
      }
    }

    if (dto.code !== undefined && dto.code !== perm.code) {
      const exists = await this.prisma.permission.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (exists) throw new ApiException(ApiCode.BadRequest);
    }

    return this.prisma.permission.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });
  }

  async remove(id: bigint, operatorId: bigint) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new ApiException(ApiCode.PermissionNotFound);
    if (perm.isSystem) {
      throw new ApiException(ApiCode.SystemDataCannotDelete);
    }

    await this.prisma.$transaction([
      // 关联表不在软删除模型列表中，此处为物理删除
      this.prisma.rolePermission.deleteMany({ where: { permissionId: id } }),
      this.prisma.permission.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedId: id,
          deletedBy: operatorId,
        },
      }),
    ]);
  }
}
