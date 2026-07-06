import { Injectable } from '@nestjs/common';

import { AppLogger } from '~/common/logger/app-logger';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';
import { deptFlatTreeKey } from '~/shared/redis/redis-keys';

import { UserContextService } from './user-context.service';

const DEPT_TREE_TTL = 300;

interface FlatDeptNode {
  id: string;
  parentId: string | null;
}

export interface DataScopeFilter {
  /** true = 无需过滤（超管 / dataScope=1） */
  all: boolean;
  /** true = 仅看本人（dataScope=2），按 userId 过滤 */
  selfOnly: boolean;
  /** 可见部门 ID 集合（all=false 且 selfOnly=false 时有效） */
  deptIds: bigint[];
}

const DENY_ALL: Readonly<DataScopeFilter> = Object.freeze({
  all: false,
  selfOnly: true,
  deptIds: [],
});
const ALLOW_ALL: Readonly<DataScopeFilter> = Object.freeze({
  all: true,
  selfOnly: false,
  deptIds: [],
});

@Injectable()
export class DataScopeService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private userContextService: UserContextService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(DataScopeService.name);
  }

  async resolve(userId: string): Promise<Readonly<DataScopeFilter>> {
    const user = await this.userContextService.getUser(userId);
    if (!user || user.status !== 1) return DENY_ALL;

    if (user.isSuperAdmin || user.dataScope === 1) return ALLOW_ALL;

    if (user.dataScope === 2) {
      return { all: false, selfOnly: true, deptIds: [] };
    }

    if (!user.deptId) return DENY_ALL;

    const rootDeptId = BigInt(user.deptId);

    if (user.dataScope === 3) {
      return { all: false, selfOnly: false, deptIds: [rootDeptId] };
    }

    if (user.dataScope === 4) {
      const deptIds = await this.getDeptAndChildren(rootDeptId);
      return { all: false, selfOnly: false, deptIds };
    }

    // dataScope === 5
    const deptIds = await this.getCustomDeptIds(BigInt(userId));
    return { all: false, selfOnly: false, deptIds };
  }

  /**
   * 构建用于 Prisma where 的部门过滤条件。
   * requestedDeptId 为用户主动筛选的部门，取与 scope 的交集。
   */
  buildDeptWhere(
    scope: Readonly<DataScopeFilter>,
    requestedDeptId?: bigint,
  ): Record<string, unknown> {
    if (scope.all) return {};
    if (scope.selfOnly) return {};
    // 无可见部门，返回不存在的 ID 实现拒绝全部
    // dept.id 从 1 自增，-1 永远不会命中
    if (scope.deptIds.length === 0) return { deptId: -1n };

    if (requestedDeptId !== undefined) {
      return scope.deptIds.includes(requestedDeptId)
        ? { deptId: requestedDeptId }
        : { deptId: -1n };
    }

    return { deptId: { in: scope.deptIds } };
  }

  /**
   * 构建用于日志表（LoginLog/OperationLog）的过滤条件。
   * 日志表通过 userId 关联用户，selfOnly 时直接按 userId 过滤。
   * requestedUserId 为用户主动筛选的 userId，取与 scope 的交集。
   */
  buildLogWhere(
    scope: Readonly<DataScopeFilter>,
    currentUserId: string,
    requestedUserId?: bigint,
  ): Record<string, unknown> {
    if (scope.all) {
      return requestedUserId !== undefined ? { userId: requestedUserId } : {};
    }
    if (scope.selfOnly) {
      // 仅看本人时，忽略外部 userId 筛选，强制只看自己
      return { userId: BigInt(currentUserId) };
    }
    // 无可见部门，返回不存在的 ID 实现拒绝全部
    if (scope.deptIds.length === 0) return { userId: -1n };
    // 部门范围过滤 + 可选 userId 叠加
    return {
      user: { deptId: { in: scope.deptIds } },
      ...(requestedUserId !== undefined && { userId: requestedUserId }),
    };
  }

  async invalidateDeptTree(): Promise<void> {
    await this.redis.del(deptFlatTreeKey).catch((e: Error) => {
      // 缓存清除失败不影响业务，旧缓存会在 TTL 后自然过期
      this.logger.warn(`Failed to invalidate dept tree cache: ${e.message}`);
    });
  }

  private async getDeptAndChildren(rootDeptId: bigint): Promise<bigint[]> {
    const flatTree = await this.getFlatDeptTree();

    const childrenMap = new Map<string, string[]>();
    for (const node of flatTree) {
      if (node.parentId !== null) {
        const children = childrenMap.get(node.parentId) ?? [];
        children.push(node.id);
        childrenMap.set(node.parentId, children);
      }
    }

    const rootIdStr = rootDeptId.toString();
    const result: bigint[] = [rootDeptId];
    const visited = new Set<string>([rootIdStr]);
    const queue: string[] = [rootIdStr];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const childId of childrenMap.get(current) ?? []) {
        if (!visited.has(childId)) {
          visited.add(childId);
          result.push(BigInt(childId));
          queue.push(childId);
        }
      }
    }

    return result;
  }

  private async getCustomDeptIds(userId: bigint): Promise<bigint[]> {
    const rows = await this.prisma.userDataScopeDept.findMany({
      where: { userId },
      select: { deptId: true },
    });
    return rows.map((r) => r.deptId);
  }

  private async getFlatDeptTree(): Promise<FlatDeptNode[]> {
    const cached = await this.redis.getCache<FlatDeptNode[]>(deptFlatTreeKey);
    if (cached) return cached;

    const depts = await this.prisma.dept.findMany({
      select: { id: true, parentId: true },
      orderBy: { sort: 'asc' },
    });

    const flat: FlatDeptNode[] = depts.map((d) => ({
      id: d.id.toString(),
      parentId: d.parentId ? d.parentId.toString() : null,
    }));

    await this.redis.setCache(deptFlatTreeKey, flat, DEPT_TREE_TTL);
    return flat;
  }
}
