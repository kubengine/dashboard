/** Bearer 会话存储。JWT exp 仅用于界面计时，身份校验始终由服务端完成。 */
export interface TokenInfo {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  username: string;
}

interface AuthStore {
  authType: 'token';
  sessionId?: string;
  token?: TokenInfo;
}

export const AUTH_STORE_KEY = 'PRO_AUTH_STORE';
const AUTH_CHANGED = 'kubengine:auth-changed';
let logoutPending: Promise<void> | null = null;

export const getTokenExpiresAt = (accessToken: string): string | undefined => {
  try {
    const segments = accessToken.split('.');
    if (segments.length !== 3) return;
    const encoded = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')),
    );
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp))
      return;
    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return;
  }
};

const announceChange = () => window.dispatchEvent(new Event(AUTH_CHANGED));

export const clearAuthStore = (): void => {
  localStorage.removeItem(AUTH_STORE_KEY);
  announceChange();
};

export const getAuthStore = (): AuthStore => {
  const raw = localStorage.getItem(AUTH_STORE_KEY);
  if (!raw) return { authType: 'token' };
  try {
    const stored = JSON.parse(raw);
    const token = stored?.token;
    const expiresAt =
      typeof token?.accessToken === 'string'
        ? getTokenExpiresAt(token.accessToken)
        : undefined;
    if (stored.authType === 'token' && expiresAt) {
      const store: AuthStore = {
        authType: 'token',
        sessionId: stored.sessionId || token.accessToken,
        token: {
          accessToken: token.accessToken,
          tokenType: 'Bearer',
          expiresAt,
          username: typeof token.username === 'string' ? token.username : '',
        },
      };
      if ('aksk' in stored)
        localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(store));
      return store;
    }
  } catch {
    // 旧 AK/SK、损坏的存储和无有效 exp 的令牌均不再作为登录会话。
  }
  clearAuthStore();
  return { authType: 'token' };
};

const storeToken = (
  token: TokenInfo,
  sessionId: string,
): AuthStore & { token: TokenInfo } => {
  const expiresAt = getTokenExpiresAt(token.accessToken);
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
    throw new Error('登录令牌无效或已过期，请重新登录');
  }
  const store = {
    authType: 'token' as const,
    sessionId,
    token: { ...token, tokenType: 'Bearer', expiresAt },
  };
  localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(store));
  announceChange();
  return store;
};

export const saveToken = (token: TokenInfo) =>
  storeToken(
    token,
    // 仅用于区分本地登录会话，不作为服务端凭据。
    `${Date.now()}-${Math.random()}`,
  );

export const getBearerToken = (): string => {
  const token = getAuthStore().token;
  return token ? `Bearer ${token.accessToken}` : '';
};

export const isTokenExpired = (): boolean => {
  const expiresAt = getAuthStore().token?.expiresAt;
  return !expiresAt || Date.parse(expiresAt) <= Date.now();
};

/** 只接收当前会话发出的请求的续签结果，防止登出后被迟到响应重新登录。 */
export const renewToken = (
  requestBearer: string,
  accessToken: string,
  tokenType: string,
): boolean => {
  const current = getAuthStore();
  if (
    logoutPending ||
    !current.token ||
    !requestBearer ||
    requestBearer !== getBearerToken()
  )
    return false;
  try {
    storeToken(
      { ...current.token, accessToken, tokenType },
      current.sessionId!,
    );
    return true;
  } catch {
    return false;
  }
};

/** 先撤销服务端令牌；失败时仍清理本地会话，由调用方明确提示撤销失败。 */
export const endSession = (
  revoke: (bearer: string) => Promise<unknown>,
): Promise<void> => {
  if (logoutPending) return logoutPending;
  const sessionId = getAuthStore().sessionId;
  const bearer = getBearerToken();
  logoutPending = Promise.resolve().then(async () => {
    try {
      if (bearer) await revoke(bearer);
    } finally {
      if (getAuthStore().sessionId === sessionId) clearAuthStore();
      logoutPending = null;
    }
  });
  return logoutPending;
};

export const subscribeAuthChanges = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORE_KEY || event.key === null) listener();
  };
  window.addEventListener(AUTH_CHANGED, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGED, listener);
    window.removeEventListener('storage', onStorage);
  };
};
