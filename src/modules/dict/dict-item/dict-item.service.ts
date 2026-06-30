import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  CreateDictItemDto,
  DictItemQueryDto,
  UpdateDictItemDto,
} from './dto/dict-item.dto';

@Injectable()
export class DictItemService {
  constructor(private prisma: PrismaService) {}

  async list(query: DictItemQueryDto) {
    const { page, pageSize, dictTypeId, label, value, status } = query;
    const where = {
      ...(dictTypeId !== undefined && { dictTypeId }),
      ...(label && {
        label: { contains: label, mode: 'insensitive' as const },
      }),
      ...(value && {
        value: { contains: value, mode: 'insensitive' as const },
      }),
      ...(status !== undefined && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.dictItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.dictItem.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const dictItem = await this.prisma.dictItem.findUnique({ where: { id } });
    if (!dictItem) throw new ApiException(ApiCode.DictNotFound, '字典项不存在');
    return dictItem;
  }

  async create(dto: CreateDictItemDto, operatorId: bigint) {
    await this.assertTypeExists(dto.dictTypeId);
    await this.assertValueUnique(dto.dictTypeId, dto.value);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.dictItem.updateMany({
          where: { dictTypeId: dto.dictTypeId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.dictItem.create({
        data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
      });
    });
  }

  async update(id: bigint, dto: UpdateDictItemDto, operatorId: bigint) {
    const dictItem = await this.prisma.dictItem.findUnique({ where: { id } });
    if (!dictItem) throw new ApiException(ApiCode.DictNotFound, '字典项不存在');

    if (dto.value !== undefined && dto.value !== dictItem.value) {
      await this.assertValueUnique(dictItem.dictTypeId, dto.value, id);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.dictItem.updateMany({
          where: {
            dictTypeId: dictItem.dictTypeId,
            isDefault: true,
            NOT: { id },
          },
          data: { isDefault: false },
        });
      }
      return tx.dictItem.update({
        where: { id },
        data: { ...dto, updatedBy: operatorId },
      });
    });
  }

  async remove(id: bigint, operatorId: bigint) {
    const dictItem = await this.prisma.dictItem.findUnique({
      where: { id },
      include: { dictType: { select: { isSystem: true } } },
    });
    if (!dictItem) throw new ApiException(ApiCode.DictNotFound, '字典项不存在');
    if (dictItem.dictType.isSystem) {
      throw new ApiException(ApiCode.BadRequest, '系统内置字典项不可删除');
    }

    return this.prisma.dictItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedId: id,
        deletedBy: operatorId,
      },
    });
  }

  private async assertTypeExists(dictTypeId: bigint) {
    const exists = await this.prisma.dictType.findUnique({
      where: { id: dictTypeId },
      select: { id: true },
    });
    if (!exists) throw new ApiException(ApiCode.DictNotFound, '字典类型不存在');
  }

  /** 同一字典类型下 value 唯一 */
  private async assertValueUnique(
    dictTypeId: bigint,
    value: string,
    excludeId?: bigint,
  ) {
    const exists = await this.prisma.dictItem.findFirst({
      where: {
        dictTypeId,
        value,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });
    if (exists)
      throw new ApiException(ApiCode.BadRequest, '字典项值在该类型下已存在');
  }
}
