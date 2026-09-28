import CryptoJS from 'crypto-js';
import { getAuthStore } from './auth';

const canonical = (value: any): any => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
};

const memory = new Map<string, string>();

/** 重试复用同一请求标识；只保存摘要和随机标识，不保存表单内容。 */
export const deploymentSubmission = (body: Record<string, any>) => {
  const session = getAuthStore().sessionId || '';
  const fingerprint = CryptoJS.SHA256(
    JSON.stringify([session, canonical(body)]),
  ).toString();
  const storageKey = `kubengine:pending-deployment:${fingerprint}`;
  let key = memory.get(storageKey);
  try {
    key = sessionStorage.getItem(storageKey) || key;
  } catch {
    // 浏览器禁用存储时，当前页面的网络重试仍复用请求标识。
  }
  if (!key) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  memory.set(storageKey, key);
  try {
    sessionStorage.setItem(storageKey, key);
  } catch {
    // 保留内存中的请求标识。
  }
  return {
    key,
    complete: () => {
      memory.delete(storageKey);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // 服务器已经接受请求，不影响成功结果。
      }
    },
  };
};
