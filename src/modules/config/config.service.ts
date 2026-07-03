import { Injectable, Logger } from '@nestjs/common';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { Prisma } from '~/generated/prisma/client';
import { PrismaService } from '~/shared/prisma/prisma.service';
import { RedisService } from '~/shared/redis/redis.service';

import {
  ConfigQueryDto,
  CreateConfigDto,
  UpdateConfigDto,
} from './dto/config.dto';

const CACHE_PREFIX = 'config:value:';
const CACHE_TTL = 3600;

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async list(query: ConfigQueryDto) {
    const { page, pageSize, keywords } = query;
    const where = {
      ...(keywords && {
        OR: [
          { configName: { contains: keywords, mode: 'insensitive' as const } },
          { configKey: { contains: keywords, mode: 'insensitive' as const } },
        ],
      }),
    };

    const noPage = pageSize === 0;

    const [items, total] = await Promise.all([
      this.prisma.config.findMany({
        where,
        ...(noPage ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.config.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: bigint) {
    const config = await this.prisma.config.findUnique({ where: { id } });
    if (!config) {
      throw new ApiException(ApiCode.ConfigNotFound, '配置不存在');
    }
    return config;
  }

  async getFormData(id: bigint) {
    const config = await this.prisma.config.findUnique({
      where: { id },
      select: {
        id: true,
        configName: true,
        configKey: true,
        configValue: true,
        remark: true,
      },
    });
    if (!config) {
      throw new ApiException(ApiCode.ConfigNotFound, '配置不存在');
    }
    return config;
  }

  async create(dto: CreateConfigDto, operatorId: bigint) {
    try {
      return await this.prisma.config.create({
        data: { ...dto, createdBy: operatorId, updatedBy: operatorId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ApiException(ApiCode.DuplicateConfigKey, '配置键已存在');
      }
      throw e;
    }
  }

  async update(id: bigint, dto: UpdateConfigDto, operatorId: bigint) {
    const config = await this.prisma.config.findUnique({ where: { id } });
    if (!config) {
      throw new ApiException(ApiCode.ConfigNotFound, '配置不存在');
    }
    if (
      config.isSystem &&
      dto.configKey !== undefined &&
      dto.configKey !== config.configKey
    ) {
      throw new ApiException(
        ApiCode.SystemConfigCannotModify,
        '系统内置配置键不可修改',
      );
    }

    if (dto.configKey !== undefined && dto.configKey !== config.configKey) {
      const exists = await this.prisma.config.findFirst({
        where: { configKey: dto.configKey, NOT: { id } },
        select: { id: true },
      });
      if (exists) {
        throw new ApiException(ApiCode.DuplicateConfigKey, '配置键已存在');
      }
    }

    let updated: Awaited<ReturnType<typeof this.prisma.config.update>>;
    try {
      updated = await this.prisma.config.update({
        where: { id },
        data: {
          ...(dto.configName !== undefined && { configName: dto.configName }),
          ...(dto.configKey !== undefined && { configKey: dto.configKey }),
          ...(dto.configValue !== undefined && {
            configValue: dto.configValue,
          }),
          ...(dto.remark !== undefined && { remark: dto.remark }),
          updatedBy: operatorId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ApiException(ApiCode.DuplicateConfigKey, '配置键已存在');
      }
      throw e;
    }

    const oldKey = config.configKey;
    const newKey = dto.configKey !== undefined ? dto.configKey : oldKey;
    await this.invalidateCache(oldKey);
    if (newKey !== oldKey) {
      await this.invalidateCache(newKey);
    }
    return updated;
  }

  async remove(id: bigint) {
    const config = await this.prisma.config.findUnique({ where: { id } });
    if (!config) {
      throw new ApiException(ApiCode.ConfigNotFound, '配置不存在');
    }
    if (config.isSystem) {
      throw new ApiException(
        ApiCode.SystemConfigCannotModify,
        '系统内置配置不可删除',
      );
    }

    await this.prisma.config.delete({ where: { id } });
    await this.invalidateCache(config.configKey);
  }

  async refreshCache() {
    const configs = await this.prisma.config.findMany({
      select: { configKey: true },
    });
    const keys = configs.map((c) => `${CACHE_PREFIX}${c.configKey}`);
    if (keys.length > 0) {
      await this.redis.delMany(keys);
    }
    return { cleared: keys.length };
  }

  /**
   * 按配置键获取配置值，优先读缓存。
   * 供其他模块调用，不经过权限校验。
   */
  async getValueByKey(key: string): Promise<string | null> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    try {
      const cached = await this.redis.getCache<string>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch {
      // Redis 不可用时降级直查 DB
    }

    const config = await this.prisma.config.findUnique({
      where: { configKey: key },
      select: { configValue: true },
    });
    if (!config) {
      return null;
    }

    try {
      await this.redis.setCache(cacheKey, config.configValue, CACHE_TTL);
    } catch {
      // 缓存写入失败不影响读取
    }
    return config.configValue;
  }

  private async invalidateCache(configKey: string) {
    try {
      await this.redis.del(`${CACHE_PREFIX}${configKey}`);
    } catch (e) {
      this.logger.warn(`缓存失效失败: ${configKey}, ${(e as Error).message}`);
    }
  }
}
