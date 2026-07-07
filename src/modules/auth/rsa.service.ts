import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { constants, generateKeyPair, privateDecrypt } from 'node:crypto';
import { promisify } from 'node:util';

import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import { AppLogger } from '~/common/logger/app-logger';
import { ISecurityConfig, SecurityConfig } from '~/config';
import { RedisService } from '~/shared/redis/redis.service';

const generateKeyPairAsync = promisify(generateKeyPair);

// old 密钥额外保留的缓冲时间，防止轮换延迟导致 overlap 窗口断裂
const OLD_KEY_BUFFER_SECONDS = 30;

const RSA_PUB_KEY = 'rsa:pub';
const RSA_CUR_KEY = 'rsa:cur';
const RSA_OLD_KEY = 'rsa:old';

@Injectable()
export class RsaService implements OnModuleInit, OnModuleDestroy {
  private rotateTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(SecurityConfig.KEY)
    private readonly securityConfig: ISecurityConfig,
    private readonly redis: RedisService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(RsaService.name);
  }

  async onModuleInit(): Promise<void> {
    if (!this.securityConfig.rsa.enabled) return;

    this.validateConfig();

    const exists = await this.redis.exists(RSA_PUB_KEY);
    if (!exists) {
      await this.rotateKeyPair();
    }

    this.scheduleNextRotation();

    this.logger.info(
      `RSA service initialized: RSA-OAEP/SHA-256, ` +
        `keyBits=${this.securityConfig.rsa.keyBits}, ` +
        `ttl=${this.securityConfig.rsa.ttlSeconds}s, ` +
        `rotate=${this.securityConfig.rsa.rotateSeconds}s`,
    );
  }

  onModuleDestroy(): void {
    if (this.rotateTimer) {
      clearTimeout(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  private validateConfig(): void {
    const { keyBits, rotateSeconds, ttlSeconds } = this.securityConfig.rsa;

    if (keyBits < 2048) {
      throw new Error(`RSA_KEY_BITS must be >= 2048, got ${keyBits}`);
    }

    if (rotateSeconds <= 0) {
      throw new Error(`RSA_ROTATE_SECONDS must be > 0, got ${rotateSeconds}`);
    }

    if (rotateSeconds >= ttlSeconds) {
      throw new Error(
        `RSA_ROTATE_SECONDS (${rotateSeconds}s) must be < RSA_TTL_SECONDS (${ttlSeconds}s)` +
          ` — old keys would expire before next rotation`,
      );
    }

    if (rotateSeconds > ttlSeconds / 2) {
      this.logger.warn(
        `RSA_ROTATE_SECONDS (${rotateSeconds}s) > TTL/2 (${ttlSeconds / 2}s) — ` +
          `safety margin is thin, a delayed rotation may cause a key gap. ` +
          `Recommend ROTATE ≤ TTL/2`,
      );
    }
  }

  /**
   * 递归调度下一次轮换。
   * 用 setTimeout 而非 @Cron，因为轮换间隔由运行时配置决定。
   * 递归保证上次轮换完成后再计时，不会任务堆积。
   */
  private scheduleNextRotation(): void {
    const ms = this.securityConfig.rsa.rotateSeconds * 1000;
    this.rotateTimer = setTimeout(() => {
      void this.performRotation();
    }, ms);
    this.rotateTimer.unref?.();
  }

  private async performRotation(): Promise<void> {
    try {
      await this.rotateKeyPair();
    } catch (err) {
      this.logger.error(`RSA rotation failed: ${(err as Error).message}`, {
        error: err,
      });
    }
    this.scheduleNextRotation();
  }

  /**
   * 生成新密钥对，轮换：cur → old，新密钥 → cur，公钥同步更新。
   * 用 generateKeyPair（异步）而非 generateKeyPairSync，避免阻塞事件循环。
   * old 的 TTL = rotateSeconds + buffer，保证轮换延迟时 overlap 窗口不断裂。
   */
  async rotateKeyPair(): Promise<string> {
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
      modulusLength: this.securityConfig.rsa.keyBits,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const curTtl = this.securityConfig.rsa.ttlSeconds;
    const oldTtl =
      this.securityConfig.rsa.rotateSeconds + OLD_KEY_BUFFER_SECONDS;

    const currentPrivateKey = await this.redis.getCache<string>(RSA_CUR_KEY);

    const ops: Promise<unknown>[] = [
      this.redis.setCache(RSA_CUR_KEY, privateKey, curTtl),
      this.redis.setCache(RSA_PUB_KEY, publicKey, curTtl),
    ];
    if (currentPrivateKey) {
      ops.push(this.redis.setCache(RSA_OLD_KEY, currentPrivateKey, oldTtl));
    }
    await Promise.all(ops);

    this.logger.debug(
      `Rotated RSA key pair. cur TTL=${curTtl}s, old TTL=${oldTtl}s`,
    );
    return publicKey;
  }

  async getPublicKey(): Promise<{ publicKey: string }> {
    if (!this.securityConfig.rsa.enabled) {
      throw new ApiException(ApiCode.RsaDisabled);
    }

    const publicKey = await this.redis.getCache<string>(RSA_PUB_KEY);
    if (publicKey) return { publicKey };

    this.logger.warn('RSA public key missing, triggering rotation');
    return { publicKey: await this.rotateKeyPair() };
  }

  /**
   * 解密前端加密的密码。
   * 先试当前私钥，失败后试上一轮私钥，保证轮换间隙的请求仍能解密。
   */
  async decrypt(encryptedData: string): Promise<string> {
    const [cur, old] = await this.redis.getMany<string>([
      RSA_CUR_KEY,
      RSA_OLD_KEY,
    ]);

    if (cur) {
      const result = this.tryDecrypt(cur, encryptedData);
      if (result !== null) return result;
    }

    if (old) {
      const result = this.tryDecrypt(old, encryptedData);
      if (result !== null) return result;
    }

    this.logger.warn('RSA decryption failed: no matching private key');
    throw new ApiException(ApiCode.RsaDecryptFailed);
  }

  private tryDecrypt(privateKey: string, encryptedData: string): string | null {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = privateDecrypt(
        {
          key: privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer,
      );
      return decrypted.toString('utf8');
    } catch {
      return null;
    }
  }
}
