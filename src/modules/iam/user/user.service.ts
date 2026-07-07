import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { DataScopeService } from '~/modules/auth/data-scope.service';
import { PasswordService } from '~/modules/auth/password.service';
import { UserContextService } from '~/modules/auth/user-context.service';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  AssignDataScopeDto,
  AssignRolesDto,
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private userContextService: UserContextService,
    private dataScopeService: DataScopeService,
  ) {}

  async list(query: UserQueryDto, currentUserId: string) {
    const { page, pageSize, username, nickname, deptId, status } = query;

    const scope = await this.dataScopeService.resolve(currentUserId);
    const scopeWhere = scope.selfOnly
      ? { id: BigInt(currentUserId) }
      : this.dataScopeService.buildDeptWhere(scope, deptId);

    const where = {
      ...(username && {
        username: { contains: username, mode: 'insensitive' as const },
      }),
      ...(nickname && {
        nickname: { contains: nickname, mode: 'insensitive' as const },
      }),
      ...scopeWhere,
      ...(status !== undefined && { status }),
    };

    const noPage = pageSize === 0;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        ...(noPage ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        select: {
          id: true,
          username: true,
          nickname: true,
          realName: true,
          email: true,
          phone: true,
          gender: true,
          status: true,
          isSuperAdmin: true,
          deptId: true,
          dataScope: true,
          remark: true,
          avatarFileId: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          select: { roleId: true },
        },
        avatarFile: {
          select: { id: true, originalName: true, mimeType: true },
        },
      },
    });
    if (!user) throw new ApiException(ApiCode.UserNotFound);

    const { userRoles, ...rest } = user;
    return {
      ...rest,
      roleIds: userRoles.map((ur) => ur.roleId),
    };
  }

  async create(dto: CreateUserDto, operatorId: bigint) {
    const exists = await this.prisma.user.findFirst({
      where: { username: dto.username },
      select: { id: true },
    });
    if (exists) throw new ApiException(ApiCode.DuplicateUsername);

    if (dto.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email },
        select: { id: true },
      });
      if (emailExists) throw new ApiException(ApiCode.DuplicateEmail);
    }

    if (dto.deptId) {
      const dept = await this.prisma.dept.findUnique({
        where: { id: dto.deptId },
      });
      if (!dept) throw new ApiException(ApiCode.DeptNotFound);
    }

    if (dto.avatarFileId != null) {
      const file = await this.prisma.file.findUnique({
        where: { id: dto.avatarFileId },
        select: { id: true },
      });
      if (!file) throw new ApiException(ApiCode.FileNotFound);
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          nickname: dto.nickname,
          realName: dto.realName,
          email: dto.email,
          phone: dto.phone,
          gender: dto.gender,
          deptId: dto.deptId,
          avatarFileId: dto.avatarFileId,
          status: dto.status,
          remark: dto.remark,
          createdBy: operatorId,
          updatedBy: operatorId,
        },
      });

      await tx.userCredential.create({
        data: {
          userId: user.id,
          passwordHash,
        },
      });

      return user;
    });
  }

  async update(id: bigint, dto: UpdateUserDto, operatorId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound);

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
        select: { id: true },
      });
      if (emailExists) throw new ApiException(ApiCode.DuplicateEmail);
    }

    if (dto.deptId != null && dto.deptId !== user.deptId) {
      const dept = await this.prisma.dept.findUnique({
        where: { id: dto.deptId },
      });
      if (!dept) throw new ApiException(ApiCode.DeptNotFound);
    }

    if (dto.avatarFileId != null) {
      const file = await this.prisma.file.findUnique({
        where: { id: dto.avatarFileId },
        select: { id: true },
      });
      if (!file) throw new ApiException(ApiCode.FileNotFound);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });

    // 用户信息变更后使 Redis 缓存失效，下次请求重新从 DB 加载
    // 缓存清除失败不影响已提交的更新，缓存会在 TTL 后自然过期
    this.userContextService.invalidate(id.toString()).catch(() => undefined);

    return updated;
  }

  async remove(id: bigint, operatorId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound);
    if (user.isSuperAdmin) {
      throw new ApiException(ApiCode.BadRequest);
    }

    await this.prisma.$transaction([
      // 关联表不在软删除模型列表中，以下均为物理删除
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userDataScopeDept.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedId: id,
          deletedBy: operatorId,
        },
      }),
    ]);
  }

  async assignRoles(id: bigint, dto: AssignRolesDto, operatorId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound);

    const roleIds = dto.roleIds.map((rid) => BigInt(rid));

    if (roleIds.length > 0) {
      const validCount = await this.prisma.role.count({
        where: { id: { in: roleIds } },
      });
      if (validCount !== roleIds.length) {
        throw new ApiException(ApiCode.BadRequest);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        // createMany 一次 SQL 插入，比多个 create 拼事务更高效
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: id,
            roleId,
            createdBy: operatorId,
          })),
        });
      }
    });

    // 角色变更影响权限缓存，使缓存失效
    this.userContextService.invalidate(id.toString()).catch(() => undefined);
  }

  async assignDataScope(
    id: bigint,
    dto: AssignDataScopeDto,
    operatorId: bigint,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound);

    const deptIds = (dto.deptIds ?? []).map((did) => BigInt(did));

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { dataScope: dto.dataScope, updatedBy: operatorId },
      });

      await tx.userDataScopeDept.deleteMany({ where: { userId: id } });

      if (dto.dataScope === 5 && deptIds.length > 0) {
        const validCount = await tx.dept.count({
          where: { id: { in: deptIds } },
        });
        if (validCount !== deptIds.length) {
          throw new ApiException(ApiCode.BadRequest);
        }

        await tx.userDataScopeDept.createMany({
          data: deptIds.map((deptId) => ({ userId: id, deptId })),
        });
      }
    });

    // 数据范围变更影响用户缓存，使缓存失效
    this.userContextService.invalidate(id.toString()).catch(() => undefined);
  }

  async resetPassword(id: bigint, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound);

    const passwordHash = await this.passwordService.hash(dto.password);

    // 管理员重置后强制用户下次登录修改密码，避免明文密码经手风险
    await this.prisma.userCredential.update({
      where: { userId: id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
      },
    });
  }
}
