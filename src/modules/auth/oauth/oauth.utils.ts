import { ApiException } from '~/common/exceptions/api.exception';
import { ApiCode } from '~/common/exceptions/error-code';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

/**
 * 获取代理 URL（运行时读取，确保 .env 已加载）
 */
function getProxyUrl(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy
  );
}

/**
 * 通过 HTTP CONNECT 隧道代理发送请求。
 *
 * Node.js 全局 fetch 不支持代理，undici 与 Node 20 存在兼容性问题，
 * 这里用原生 http/https 模块实现 CONNECT 隧道。
 */
function requestViaProxy(
  targetUrl: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
): Promise<{
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}> {
  const target = new URL(targetUrl);
  const proxyUrl = getProxyUrl();
  const proxy = new URL(proxyUrl!);

  return new Promise((resolve, reject) => {
    const connectReq = http.request({
      host: proxy.hostname,
      port: Number(proxy.port) || 80,
      method: 'CONNECT',
      path: `${target.hostname}:${target.port || 443}`,
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`代理 CONNECT 失败: HTTP ${res.statusCode}`));
        return;
      }

      const req = https.request(
        targetUrl,
        {
          method: init.method,
          headers: init.headers,
          socket,
          servername: target.hostname,
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

    connectReq.on('error', reject);
    connectReq.end();
  });
}

/**
 * 直接发送请求（不走代理）
 */
function requestDirect(
  targetUrl: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
): Promise<{
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}> {
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

interface ResponseLike {
  status: number;
  text: () => Promise<string>;
  json: <T>() => Promise<T>;
}

async function doRequest(
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
  options?: { skipProxy?: boolean },
): Promise<ResponseLike> {
  const proxyUrl = options?.skipProxy ? undefined : getProxyUrl();
  try {
    if (proxyUrl) {
      return await requestViaProxy(url, init);
    }
    return await requestDirect(url, init);
  } catch {
    throw new ApiException(
      init.method === 'POST'
        ? ApiCode.OAuthCodeExchangeFailed
        : ApiCode.OAuthUserInfoFailed,
    );
  }
}

/**
 * POST 表单并返回解析结果，HTTP 错误统一转为 ApiException。
 */
export async function postJson<T>(
  url: string,
  body: Record<string, string>,
  headers?: Record<string, string>,
  options?: { skipProxy?: boolean },
): Promise<T> {
  const form = new URLSearchParams(body);

  const res = await doRequest(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        ...headers,
      },
      body: form.toString(),
    },
    options,
  );

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
  options?: { skipProxy?: boolean },
): Promise<T> {
  const res = await doRequest(
    url,
    {
      method: 'GET',
      headers: headers ?? {},
    },
    options,
  );

  if (res.status < 200 || res.status >= 300) {
    throw new ApiException(ApiCode.OAuthUserInfoFailed);
  }

  return res.json<T>();
}
