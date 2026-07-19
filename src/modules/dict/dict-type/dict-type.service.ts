import { Injectable } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { PrismaService } from '~/shared/prisma/prisma.service';

import {
  CreateDictTypeDto,
  DictTypeQueryDto,
  UpdateDictTypeDto,
} from './dto/dict-type.dto';

@Injectable()
export class DictTypeService {
  constructor(private prisma: PrismaService) {}

  async list(query: DictTypeQueryDto) {
    const { page, pageSize, code, name, status } = query;
    const where = {
      ...(code && { code: { contains: code, mode: 'insensitive' as const } }),
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(status !== undefined && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.dictType.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      this.prisma.dictType.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const dictType = await this.prisma.dictType.findUnique({
      where: { id },
      include: { items: { orderBy: { sort: 'asc' } } },
    });
    if (!dictType) throw new ApiException(ApiCode.DictNotFound);
    return dictType;
  }

  async create(dto: CreateDictTypeDto, operatorId: bigint) {
    const exists = await this.prisma.dictType.findFirst({
      where: { code: dto.code },
      select: { id: true },
    });
    if (exists) throw new ApiException(ApiCode.BadRequest);

    return this.prisma.dictType.create({
      data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
    });
  }

  async update(id: bigint, dto: UpdateDictTypeDto, operatorId: bigint) {
    const dictType = await this.prisma.dictType.findUnique({ where: { id } });
    if (!dictType) throw new ApiException(ApiCode.DictNotFound);
    if (
      dictType.isSystem &&
      dto.code !== undefined &&
      dto.code !== dictType.code
    ) {
      throw new ApiException(ApiCode.SystemDataCodeImmutable);
    }

    if (dto.code !== undefined && dto.code !== dictType.code) {
      const exists = await this.prisma.dictType.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (exists) throw new ApiException(ApiCode.BadRequest);
    }

    return this.prisma.dictType.update({
      where: { id },
      data: { ...dto, updatedBy: operatorId },
    });
  }

  async remove(id: bigint, operatorId: bigint) {
    const dictType = await this.prisma.dictType.findUnique({ where: { id } });
    if (!dictType) throw new ApiException(ApiCode.DictNotFound);
    if (dictType.isSystem) {
      throw new ApiException(ApiCode.SystemDataCannotDelete);
    }

    const itemCount = await this.prisma.dictItem.count({
      where: { dictTypeId: id },
    });
    if (itemCount > 0) {
      throw new ApiException(ApiCode.BadRequest);
    }

    return this.prisma.dictType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedId: id,
        deletedBy: operatorId,
      },
    });
  }

  /** 按编码查询启用的字典项，供业务侧下拉/枚举使用 */
  async itemsByCode(code: string) {
    const dictType = await this.prisma.dictType.findFirst({
      where: { code, status: 1 },
      select: { id: true },
    });
    if (!dictType) throw new ApiException(ApiCode.DictNotFound);

    return this.prisma.dictItem.findMany({
      where: { dictTypeId: dictType.id, status: 1 },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        label: true,
        value: true,
        color: true,
        cssClass: true,
        isDefault: true,
        sort: true,
      },
    });
  }
}
