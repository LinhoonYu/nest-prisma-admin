import { Injectable } from '@nestjs/common';

import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';

const USER_PREFIX = 'user:';
const ROLES_PREFIX = 'user:roles:';
const PERMS_PREFIX = 'user:perms:';
const CACHE_TTL = 300;

interface CachedUser {
  id: string;
  username: string;
  nickname: string | null;
  realName: string | null;
  avatarFileId: string | null;
  email: string | null;
  phone: string | null;
  gender: number;
  status: number;
  isSuperAdmin: boolean;
  deptId: string | null;
  dataScope: number;
}

@Injectable()
export class UserContextService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getUser(userId: string): Promise<CachedUser | null> {
    const cacheKey = USER_PREFIX + userId;
    const cached = await this.redis.getCache<CachedUser>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        username: true,
        nickname: true,
        realName: true,
        avatarFileId: true,
        email: true,
        phone: true,
        gender: true,
        status: true,
        isSuperAdmin: true,
        deptId: true,
        dataScope: true,
      },
    });

    if (user) {
      // BigInt 无法 JSON 序列化，转为 string
      const cachedUser: CachedUser = {
        ...user,
        id: String(user.id),
        avatarFileId: user.avatarFileId ? String(user.avatarFileId) : null,
        deptId: user.deptId ? String(user.deptId) : null,
      };
      await this.redis.setCache(cacheKey, cachedUser, CACHE_TTL);
      return cachedUser;
    }
    return null;
  }

  async getRoleCodes(userId: string): Promise<string[]> {
    const cacheKey = ROLES_PREFIX + userId;
    const cached = await this.redis.getCache<string[]>(cacheKey);
    if (cached) return cached;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: BigInt(userId) },
      select: { roleId: true },
    });
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds }, status: 1 },
      select: { code: true },
    });

    const codes = roles.map((r) => r.code);
    await this.redis.setCache(cacheKey, codes, CACHE_TTL);
    return codes;
  }

  async getPermissionCodes(userId: string): Promise<string[]> {
    const cacheKey = PERMS_PREFIX + userId;
    const cached = await this.redis.getCache<string[]>(cacheKey);
    if (cached) return cached;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: BigInt(userId) },
      select: { roleId: true },
    });
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((ur) => ur.roleId);
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permissionId: true },
    });
    if (rolePermissions.length === 0) return [];

    const permissionIds = [
      ...new Set(rolePermissions.map((rp) => rp.permissionId)),
    ];
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds }, status: 1 },
      select: { code: true },
    });

    const codes = permissions.map((p) => p.code);
    await this.redis.setCache(cacheKey, codes, CACHE_TTL);
    return codes;
  }

  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isSuperAdmin ?? false;
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.delMany([
      USER_PREFIX + userId,
      ROLES_PREFIX + userId,
      PERMS_PREFIX + userId,
    ]);
  }
}
