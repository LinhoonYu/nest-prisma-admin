/* eslint-disable @typescript-eslint/no-unsafe-return --
   Prisma client extension 的 query handler 在跨 model 复用时，
   args / query / model delegate 只能推断为 any，无法逐 model 特化类型。
   以下 unsafe 规则在此文件内全局禁用。
*/
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await -- handler 声明为 async 以匹配 Prisma 签名，内部不一定 await */

import { Prisma, PrismaClient } from '~/generated/prisma/client';

import { isIncludingDeleted, isHardDelete } from './soft-delete.context';

const SOFT_DELETE_MODELS = [
  'user',
  'userIdentity',
  'dept',
  'role',
  'menu',
  'permission',
  'dictType',
  'dictItem',
] as const;

type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * 给单个 model 创建软删除查询拦截器。
 * client 是未扩展的 PrismaClient，内部查询需手动带 deletedId: 0n。
 */
function createQueryHandlers(client: PrismaClient) {
  return {
    async findUnique({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async findUniqueOrThrow({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async findFirst({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async findFirstOrThrow({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async findMany({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async count({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async aggregate({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async groupBy({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async update({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async updateMany({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async upsert({ args, query }) {
      if (!isIncludingDeleted()) {
        args.where = { ...args.where, deletedId: 0n };
      }
      return query(args);
    },

    async delete({ model, args, query }) {
      if (isHardDelete()) return query(args);

      // 手动带 deletedId: 0n，因为 client 是未扩展的
      const record = await (client as any)[model].findUnique({
        where: { ...args.where, deletedId: 0n },
        select: { id: true },
      });
      if (!record) {
        // 记录不存在或已软删，让 Prisma 原生 delete 抛 P2025
        return query({ ...args, where: { ...args.where, deletedId: 0n } });
      }

      return (client as any)[model].update({
        where: { id: record.id },
        data: {
          deletedAt: new Date(),
          deletedId: record.id,
        },
      });
    },

    async deleteMany({ model, args, query }) {
      if (isHardDelete()) return query(args);

      const records = await (client as any)[model].findMany({
        where: { ...args.where, deletedId: 0n },
        select: { id: true },
      });
      if (records.length === 0) return { count: 0 };

      await client.$transaction(
        records.map((r: { id: bigint }) =>
          (client as any)[model].update({
            where: { id: r.id },
            data: {
              deletedAt: new Date(),
              deletedId: r.id,
            },
          }),
        ),
      );
      return { count: records.length };
    },
  };
}

export function softDeleteExtension(client: PrismaClient) {
  const handlers = createQueryHandlers(client);

  const query = SOFT_DELETE_MODELS.reduce(
    (acc, model) => {
      acc[model] = handlers;
      return acc;
    },
    {} as Record<SoftDeleteModel, typeof handlers>,
  );

  return Prisma.defineExtension({
    name: 'softDelete',
    query,
  });
}
