/** HTTP 错误、提示归属与会话处理。独立于 Umi/React，供请求和上传复用。 */
export type ErrorMode = 'global' | 'local' | 'silent';
export type ErrorKind =
  | 'auth'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'rate-limit'
  | 'upstream'
  | 'server'
  | 'business'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'protocol';
export interface RequestOptions {
  url?: string;
  method?: string;
  headers?: any;
  responseType?: string;
  errorMode?: ErrorMode;
  /** 兼容旧服务：仅表示页面处理提示，不跳过会话清理。 */
  skipErrorHandler?: boolean;
  [key: string]: any;
}
export interface ResponseLike {
  status: number;
  data: any;
  headers?: any;
  config?: RequestOptions;
}
export interface FieldError {
  loc: (string | number)[];
  type?: string;
  msg: string;
}
const pathOf = (url = '') => {
  try {
    return new URL(url, 'http://local').pathname;
  } catch {
    return '';
  }
};

export class ApiError extends Error {
  readonly name = 'ApiError';
  code: number;
  httpStatus?: number;
  errorCode: string;
  requestId: string;
  kind: ErrorKind;
  fields: FieldError[];
  uncertain: boolean;
  retryAfter?: string;
  handled = false;
  authHandled = false;
  stale = false;
  silent = false;
  config: RequestOptions;
  response?: { status: number; data: any; config: RequestOptions };
  constructor(
    message: string,
    options: {
      code: number;
      httpStatus?: number;
      errorCode: string;
      requestId: string;
      kind: ErrorKind;
      fields?: FieldError[];
      uncertain?: boolean;
      retryAfter?: string;
      config?: RequestOptions;
    },
  ) {
    super(message);
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.errorCode = options.errorCode;
    this.requestId = options.requestId;
    this.kind = options.kind;
    this.fields = options.fields || [];
    this.uncertain = options.uncertain || false;
    this.retryAfter = options.retryAfter;
    // 不保留请求体、凭据、完整 Axios config 或原异常，避免日志泄露密码/Token。
    this.config = {
      url: pathOf(options.config?.url),
      method: options.config?.method,
      errorMode: options.config?.errorMode,
      skipErrorHandler: options.config?.skipErrorHandler,
    };
    if (options.httpStatus !== undefined)
      this.response = {
        status: options.httpStatus,
        config: this.config,
        data: {
          code: this.code,
          message,
          error_code: this.errorCode,
          request_id: this.requestId,
          details: this.fields,
        },
      };
  }
}

export const isSuccessCode = (code: unknown): boolean =>
  typeof code === 'number' && code >= 200 && code < 300;
const object = (value: any): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const codeOf = (value: any): number | undefined =>
  typeof value === 'number' && Number.isInteger(value)
    ? value
    : typeof value === 'string' && /^\d{3}$/.test(value)
    ? Number(value)
    : undefined;
export const header = (headers: any, name: string): string => {
  const value =
    typeof headers?.get === 'function'
      ? headers.get(name)
      : Object.entries(headers || {}).find(
          ([key]) => key.toLowerCase() === name.toLowerCase(),
        )?.[1];
  return typeof value === 'string' ? value : '';
};
export const requestBearer = (options?: RequestOptions): string =>
  header(options?.headers, 'Authorization');

const mutating = (options?: RequestOptions) =>
  !['GET', 'HEAD', 'OPTIONS'].includes(
    (options?.method || 'GET').toUpperCase(),
  );
const cancelled = (error: any) =>
  error?.kind === 'cancelled' ||
  error?.code === 'ERR_CANCELED' ||
  error?.name === 'AbortError' ||
  error?.name === 'CanceledError' ||
  error?.__CANCEL__ === true;
const fieldsOf = (body: any): FieldError[] => {
  const details = Array.isArray(body?.details)
    ? body.details
    : Array.isArray(body?.detail)
    ? body.detail
    : [];
  return details
    .filter((v: any) => object(v) && Array.isArray(v.loc))
    .slice(0, 30)
    .map((v: any) => ({
      loc: v.loc.filter(
        (x: any) => typeof x === 'string' || typeof x === 'number',
      ),
      type: typeof v.type === 'string' ? v.type : undefined,
      msg:
        v.type === 'missing'
          ? '必填项不能为空'
          : typeof v.msg === 'string'
          ? v.msg.slice(0, 300)
          : '参数不正确',
    }));
};
const fallback = (status: number) =>
  ((
    {
      400: '请求内容不正确，请检查输入',
      401: '登录已失效，请重新登录',
      403: '没有执行此操作的权限',
      404: '请求的资源不存在或已删除',
      409: '资源状态已变化，请刷新后重试',
      410: '请求的资源已失效',
      413: '上传内容超过大小限制',
      422: '请求参数校验失败，请检查输入',
      429: '请求过于频繁，请稍后重试',
      500: '服务处理失败，请稍后重试',
      502: '上游服务异常，请检查连接',
      503: '服务暂不可用，请稍后重试',
      504: '上游服务请求超时',
    } as Record<number, string>
  )[status] || '操作失败，请稍后重试');
const kindOf = (status: number, errorCode: string): ErrorKind => {
  if (errorCode === 'UPSTREAM_AUTH_ERROR') return 'upstream';
  return (
    (
      {
        401: 'auth',
        403: 'forbidden',
        404: 'not-found',
        409: 'conflict',
        422: 'validation',
        429: 'rate-limit',
        502: 'upstream',
        504: 'timeout',
      } as Record<number, ErrorKind>
    )[status] || (status >= 500 && status <= 599 ? 'server' : 'business')
  );
};
export const normalizeError = (
  original: any,
  response?: ResponseLike,
  incomingBody?: any,
): ApiError => {
  if (original instanceof ApiError) return original;
  const options =
    response?.config || original?.config || original?.response?.config || {};
  const httpStatus = response?.status ?? original?.response?.status;
  const body = incomingBody ?? response?.data ?? original?.response?.data;
  const suppliedCode = codeOf(body?.code);
  const code =
    suppliedCode ??
    (body?.success === false && isSuccessCode(httpStatus) ? 400 : httpStatus) ??
    0;
  const errorCode =
    typeof body?.error_code === 'string'
      ? body.error_code
      : code === 401 && httpStatus === 200
      ? 'UPSTREAM_AUTH_ERROR'
      : '';
  const requestId =
    header(response?.headers || original?.response?.headers, 'X-Request-ID') ||
    (typeof body?.request_id === 'string' ? body.request_id : '') ||
    header(options.headers, 'X-Request-ID');
  let kind: ErrorKind = kindOf(
    httpStatus && httpStatus >= 400 ? httpStatus : code,
    errorCode,
  );
  let message =
    (typeof body?.message === 'string' && body.message.trim()) ||
    (typeof body?.detail === 'string' && body.detail.trim()) ||
    fallback(code);
  message = message.slice(0, 2000);
  const login = pathOf(options.url) === '/api/v1/login';
  const transportFailure = Boolean(
    original?.isAxiosError ||
      original?.request ||
      ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(original?.code),
  );
  if (cancelled(original)) {
    kind = 'cancelled';
    message = '请求已取消';
  } else if (!httpStatus && transportFailure) {
    kind = ['ECONNABORTED', 'ETIMEDOUT'].includes(original?.code)
      ? 'timeout'
      : 'network';
    message =
      kind === 'timeout'
        ? '请求超时，请稍后重试'
        : '无法连接服务器，请检查网络';
  } else if (!httpStatus) {
    kind = 'business';
    message = '请求处理失败，请稍后重试';
  }
  const uncertain =
    !login &&
    mutating(options) &&
    errorCode !== 'UPSTREAM_AUTH_ERROR' &&
    ((transportFailure && !httpStatus) ||
      (httpStatus || 0) >= 500 ||
      (code >= 500 && code <= 599)) &&
    kind !== 'cancelled';
  if (uncertain && !message.includes('核对'))
    message += '；操作可能已执行，请先刷新核对，避免重复提交';
  return new ApiError(message, {
    code,
    httpStatus,
    errorCode,
    requestId,
    kind,
    uncertain,
    fields: fieldsOf(body),
    config: options,
    retryAfter:
      header(response?.headers || original?.response?.headers, 'Retry-After') ||
      undefined,
  });
};

async function errorBody(response: ResponseLike): Promise<any> {
  const { data } = response;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    const attachment = header(response.headers, 'Content-Disposition')
      .toLowerCase()
      .includes('attachment');
    if (
      isSuccessCode(response.status) &&
      (attachment || !header(response.headers, 'Content-Type').includes('json'))
    )
      return undefined;
    if (data.size > 1024 ** 2) return undefined;
    try {
      return JSON.parse(await data.text());
    } catch {
      return undefined;
    }
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  return data;
}

export const shouldIgnoreError = (error: any) =>
  cancelled(error) ||
  (error instanceof ApiError &&
    (error.handled || error.authHandled || error.stale || error.silent));
export const getRequestErrorMessage = (
  error: any,
  defaultMessage = '操作失败，请重试',
): string => {
  if (shouldIgnoreError(error)) return '';
  const originalMessage =
    typeof error?.message === 'string' ? error.message : defaultMessage;
  const message =
    error instanceof ApiError &&
    error.kind === 'validation' &&
    error.fields.length
      ? '请检查以下输入'
      : originalMessage;
  const fields =
    error instanceof ApiError
      ? error.fields
          .map(
            (v) =>
              `${v.loc
                .filter((p) => !['body', 'query', 'path'].includes(String(p)))
                .join('.')}: ${v.msg}`,
          )
          .join('；')
      : '';
  const reference =
    error instanceof ApiError &&
    ['server', 'upstream', 'protocol'].includes(error.kind) &&
    error.requestId
      ? `（请求编号：${error.requestId}）`
      : '';
  return message + (fields ? `：${fields}` : '') + reference;
};

export interface PolicyEnvironment {
  origin: () => string;
  bearer: () => string;
  pathname: () => string;
  clearSession: () => void;
  redirectToLogin: () => void;
  renew: (sent: string, token: string, type: string) => unknown;
  requestId: () => string;
  notify: (value: { title: string; description: string; key: string }) => void;
  now?: () => number;
}
export function createRequestPolicy(env: PolicyEnvironment) {
  const notices = new Map<string, number>();
  const authNoticeKey = 'auth:required';
  let loginRedirectPending = false;
  const now = env.now || Date.now;
  const api = (url?: string) => {
    try {
      const u = new URL(url || '', env.origin());
      return u.origin === env.origin() && u.pathname.startsWith('/api/');
    } catch {
      return false;
    }
  };
  const notify = (error: ApiError, title?: string) => {
    const key =
      error.kind === 'auth'
        ? authNoticeKey
        : `${error.kind}:${error.code}:${error.message}`;
    const description = getRequestErrorMessage(error);
    error.handled = true;
    const stamp = now();
    for (const [k, until] of notices) if (until <= stamp) notices.delete(k);
    if (notices.has(key)) return;
    if (notices.size >= 64) notices.delete(notices.keys().next().value!);
    notices.set(key, stamp + 3000);
    env.notify({
      key,
      title:
        title ||
        (error.uncertain
          ? '操作结果待核对'
          : (
              {
                auth: '登录已失效',
                forbidden: '权限不足',
                validation: '输入有误',
                conflict: '资源状态冲突',
                network: '网络连接失败',
                timeout: '请求超时',
                protocol: '接口响应异常',
              } as Partial<Record<ErrorKind, string>>
            )[error.kind] || '操作失败'),
      description,
    });
  };
  const renew = (response: ResponseLike, body: any) => {
    if (!api(response.config?.url) || response.status === 401) return;
    const token =
      typeof body?.new_access_token === 'string'
        ? body.new_access_token
        : header(response.headers, 'X-New-Access-Token');
    if (token)
      env.renew(
        requestBearer(response.config),
        token,
        body?.token_type ||
          header(response.headers, 'X-Token-Type') ||
          'Bearer',
      );
  };
  // 路由守卫和并发 401 共用一次处理，不能依赖提示的三秒去重窗口。
  const requireLogin = () => {
    if (loginRedirectPending) return;
    const onLoginPage = env.pathname() === '/user/login';
    if (!onLoginPage) loginRedirectPending = true;
    if (env.bearer()) env.clearSession();
    if (onLoginPage) return;
    const prompt = new ApiError('请重新登录后继续操作', {
      code: 401,
      httpStatus: 401,
      errorCode: 'AUTH_REQUIRED',
      requestId: '',
      kind: 'auth',
    });
    notify(prompt, '登录已失效');
    env.redirectToLogin();
  };
  const authenticateFailure = (
    error: ApiError,
    options: RequestOptions = {},
  ) => {
    const path = pathOf(options.url);
    if (
      !api(options.url) ||
      path === '/api/v1/login' ||
      path === '/api/v1/logout' ||
      error.httpStatus !== 401 ||
      error.errorCode === 'UPSTREAM_AUTH_ERROR'
    )
      return;
    const sent = requestBearer(options),
      current = env.bearer();
    error.authHandled = true;
    if (current && sent !== current) {
      error.stale = true;
      return;
    }
    // 会话清理和跳转与提示模式无关，静默请求也不能继续使用失效身份。
    requireLogin();
  };
  return {
    requireLogin,
    prepare(options: RequestOptions) {
      if (api(options.url)) {
        if (
          loginRedirectPending &&
          pathOf(options.url) !== '/api/v1/login' &&
          env.bearer()
        ) {
          // 新会话已经开始发出受保护请求，允许再次提示后续的身份失效。
          loginRedirectPending = false;
          notices.delete(authNoticeKey);
        }
        const headers =
          typeof options.headers?.toJSON === 'function'
            ? options.headers.toJSON()
            : { ...options.headers };
        if (typeof options.headers?.forEach === 'function')
          options.headers.forEach((value: string, key: string) => {
            headers[key] = value;
          });
        if (
          pathOf(options.url) !== '/api/v1/login' &&
          env.bearer() &&
          !requestBearer(options)
        )
          headers.Authorization = env.bearer();
        if (!/^[\w.:-]{1,128}$/.test(header(options.headers, 'X-Request-ID')))
          headers['X-Request-ID'] = env.requestId();
        options.headers = headers;
      }
      return options;
    },
    async fulfilled(response: ResponseLike) {
      const body = await errorBody(response);
      renew(response, body);
      const code = codeOf(body?.code);
      if (
        !isSuccessCode(response.status) ||
        (code !== undefined && !isSuccessCode(code)) ||
        body?.success === false
      ) {
        const error = normalizeError(undefined, response, body);
        authenticateFailure(error, response.config);
        throw error;
      }
      if (object(response.data) && code !== undefined)
        response.data.code = code;
      const json =
        !response.config?.responseType ||
        response.config.responseType === 'json';
      if ([204, 205].includes(response.status) && !response.data)
        response.data = {
          code: response.status,
          message: '操作成功',
          data: null,
        };
      else if (
        api(response.config?.url) &&
        json &&
        code === undefined &&
        !['/api/v1/login', '/api/v1/health', '/api/v1/ready'].includes(
          pathOf(response.config?.url),
        )
      ) {
        throw new ApiError('接口响应格式不正确，请联系管理员', {
          code: 502,
          httpStatus: response.status,
          errorCode: 'INVALID_RESPONSE',
          kind: 'protocol',
          requestId: header(response.headers, 'X-Request-ID'),
          config: response.config,
        });
      }
      return response;
    },
    async rejected(original: any): Promise<never> {
      const response = original?.response;
      const body = response ? await errorBody(response) : undefined;
      if (response) renew(response, body);
      const error = normalizeError(original, response, body);
      authenticateFailure(error, response?.config || original?.config);
      throw error;
    },
    handle(original: any, options: RequestOptions = {}): never {
      const error = normalizeError(original);
      const mode =
        options.errorMode || (options.skipErrorHandler ? 'local' : 'global');
      if (error.kind === 'cancelled' || mode === 'silent') error.silent = true;
      if (!shouldIgnoreError(error) && mode === 'global') notify(error);
      throw error;
    },
    show(original: any, fallbackMessage?: string) {
      if (shouldIgnoreError(original) || Array.isArray(original?.errorFields))
        return;
      const error =
        original instanceof ApiError
          ? original
          : new ApiError(
              typeof original?.message === 'string'
                ? original.message
                : fallbackMessage || '操作失败，请重试',
              { code: 0, errorCode: '', requestId: '', kind: 'business' },
            );
      notify(error);
    },
  };
}
