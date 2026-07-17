import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import https from 'node:https';
import { URL } from 'node:url';

interface ResponseLike {
  status: number;
  text: () => Promise<string>;
  json: <T>() => Promise<T>;
}

/**
 * 直接发送 HTTPS 请求
 */
function request(
  targetUrl: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
): Promise<ResponseLike> {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);
    const req = https.request(
      targetUrl,
      {
        method: init.method,
        headers: init.headers,
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve({
            status: response.statusCode ?? 0,
            text: () => Promise.resolve(body),
            json: <T>() => Promise.resolve(JSON.parse(body) as T),
          });
        });
      },
    );

    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

/**
 * POST 表单并返回解析结果，HTTP 错误统一转为 ApiException。
 */
export async function postJson<T>(
  url: string,
  body: Record<string, string>,
  headers?: Record<string, string>,
): Promise<T> {
  const form = new URLSearchParams(body);

  let res: ResponseLike;
  try {
    res = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        ...headers,
      },
      body: form.toString(),
    });
  } catch {
    throw new ApiException(ApiCode.OAuthCodeExchangeFailed);
  }

  if (res.status < 200 || res.status >= 300) {
    throw new ApiException(ApiCode.OAuthCodeExchangeFailed);
  }

  return res.json<T>();
}

/**
 * GET JSON 并返回解析结果，HTTP 错误统一转为 ApiException。
 */
export async function getJson<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  let res: ResponseLike;
  try {
    res = await request(url, {
      method: 'GET',
      headers: headers ?? {},
    });
  } catch {
    throw new ApiException(ApiCode.OAuthUserInfoFailed);
  }

  if (res.status < 200 || res.status >= 300) {
    throw new ApiException(ApiCode.OAuthUserInfoFailed);
  }

  return res.json<T>();
}
