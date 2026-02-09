// src/utils/auth.ts
/**
 * 鉴权凭证存储工具（Token/AKSK）- 适配 Umi Max
 */
type AuthType = 'token' | 'aksk';

// Token 存储结构
export interface TokenInfo {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  username: string;
}

// AKSK 存储结构
export interface AKSKInfo {
  ak: string;
  sk: string;
  expiresAt: string;
}

// 全局鉴权配置
interface AuthStore {
  authType: AuthType; // 当前鉴权类型
  token?: TokenInfo;
  aksk?: AKSKInfo;
}

// 存储 key
const AUTH_STORE_KEY = 'PRO_AUTH_STORE';

/**
 * 获取当前鉴权配置
 */
export const getAuthStore = (): AuthStore => {
  const storeStr = localStorage.getItem(AUTH_STORE_KEY);
  return storeStr ? (JSON.parse(storeStr) as AuthStore) : { authType: 'token' };
};

/**
 * 保存鉴权配置
 */
export const setAuthStore = (data: Partial<AuthStore>): AuthStore => {
  const oldStore = getAuthStore();
  const newStore = { ...oldStore, ...data };
  localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(newStore));
  return newStore;
};

/**
 * 保存 Token 信息
 */
export const saveToken = (tokenInfo: TokenInfo): AuthStore => {
  return setAuthStore({
    authType: 'token',
    token: tokenInfo,
  });
};

/**
 * 保存 AKSK 信息
 */
export const saveAKSK = (akskInfo: AKSKInfo): AuthStore => {
  return setAuthStore({
    authType: 'aksk',
    aksk: akskInfo,
  });
};

/**
 * 获取当前有效 Token（Bearer Token）
 */
export const getBearerToken = (): string => {
  const { authType, token } = getAuthStore();
  if (authType === 'token' && token?.accessToken) {
    return `${token.tokenType || 'Bearer'} ${token.accessToken}`;
  }
  return '';
};

/**
 * 获取 AKSK 信息
 */
export const getAKSK = (): AKSKInfo | undefined => {
  const { authType, aksk } = getAuthStore();
  return authType === 'aksk' ? aksk : undefined;
};

/**
 * 清空所有鉴权信息（登出）
 */
export const clearAuthStore = (): void => {
  localStorage.removeItem(AUTH_STORE_KEY);
};

/**
 * 检查 Token 是否过期（简单校验，后端最终校验）
 */
export const isTokenExpired = (): boolean => {
  const { token } = getAuthStore();
  if (!token?.expiresAt) return true;
  return new Date(token.expiresAt) < new Date();
};