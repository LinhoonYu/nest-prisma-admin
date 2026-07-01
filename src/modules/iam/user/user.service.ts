import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PasswordService } from '~/modules/auth/password.service';
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
  ) {}

  async list(query: UserQueryDto) {
    const { page, pageSize, username, nickname, deptId, status } = query;
    const where = {
      ...(username && {
        username: { contains: username, mode: 'insensitive' as const },
      }),
      ...(nickname && {
        nickname: { contains: nickname, mode: 'insensitive' as const },
      }),
      ...(deptId && { deptId }),
      ...(status !== undefined && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      },
    });
    if (!user) throw new ApiException(ApiCode.UserNotFound, '用户不存在');

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
    if (exists)
      throw new ApiException(ApiCode.DuplicateUsername, '用户名已存在');

    if (dto.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email },
        select: { id: true },
      });
      if (emailExists)
        throw new ApiException(ApiCode.DuplicateEmail, '邮箱已存在');
    }

    if (dto.deptId) {
      const dept = await this.prisma.dept.findUnique({
        where: { id: dto.deptId },
      });
      if (!dept) throw new ApiException(ApiCode.DeptNotFound, '部门不存在');
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
    if (!user) throw new ApiException(ApiCode.UserNotFound, '用户不存在');

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
        select: { id: true },
      });
      if (emailExists)
        throw new ApiException(ApiCode.DuplicateEmail, '邮箱已存在');
    }

    // 部门变更时校验新部门存在，避免直接抛外键约束错误
    if (dto.deptId !== undefined && dto.deptId !== user.deptId) {
      const dept = await this.prisma.dept.findUnique({
        where: { id: dto.deptId },
      });
      if (!dept) throw new ApiException(ApiCode.DeptNotFound, '部门不存在');
    }

    return this.prisma.user.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });
  }

  async remove(id: bigint, operatorId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound, '用户不存在');
    if (user.isSuperAdmin) {
      throw new ApiException(ApiCode.BadRequest, '超级管理员不可删除');
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
    if (!user) throw new ApiException(ApiCode.UserNotFound, '用户不存在');

    if (dto.roleIds.length > 0) {
      const validCount = await this.prisma.role.count({
        where: { id: { in: dto.roleIds } },
      });
      if (validCount !== dto.roleIds.length) {
        throw new ApiException(ApiCode.BadRequest, '部分角色不存在');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length > 0) {
        // createMany 一次 SQL 插入，比多个 create 拼事务更高效
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId: id,
            roleId,
            createdBy: operatorId,
          })),
        });
      }
    });
  }

  async assignDataScope(
    id: bigint,
    dto: AssignDataScopeDto,
    operatorId: bigint,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound, '用户不存在');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { dataScope: dto.dataScope, updatedBy: operatorId },
      });

      await tx.userDataScopeDept.deleteMany({ where: { userId: id } });

      if (dto.dataScope === 5 && dto.deptIds && dto.deptIds.length > 0) {
        const validCount = await tx.dept.count({
          where: { id: { in: dto.deptIds } },
        });
        if (validCount !== dto.deptIds.length) {
          throw new ApiException(ApiCode.BadRequest, '部分部门不存在');
        }

        await tx.userDataScopeDept.createMany({
          data: dto.deptIds.map((deptId) => ({ userId: id, deptId })),
        });
      }
    });
  }

  async resetPassword(id: bigint, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiException(ApiCode.UserNotFound, '用户不存在');

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
