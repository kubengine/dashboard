import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { notification } from 'antd';
import { clearAuthStore, getBearerToken, renewToken } from './auth';
import { createRequestPolicy } from './requestPolicy';

export {
  ApiError,
  getRequestErrorMessage,
  isSuccessCode,
  shouldIgnoreError,
} from './requestPolicy';

const policy = createRequestPolicy({
  origin: () => window.location.origin,
  pathname: () => history.location.pathname,
  bearer: getBearerToken,
  clearSession: clearAuthStore,
  redirectToLogin: () => {
    if (history.location.pathname !== '/user/login')
      history.replace('/user/login');
  },
  renew: renewToken,
  requestId: () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join(''),
  notify: ({ key, title, description }) =>
    notification.error({ key, message: title, description }),
});
export const showRequestError = policy.show;
export const requireLogin = policy.requireLogin;
export const requestConfig: RequestConfig = {
  requestInterceptors: [
    (config: any) => {
      policy.prepare(config);
      return config;
    },
  ],
  responseInterceptors: [
    [
      async (response: any) => {
        await policy.fulfilled(response);
        return response;
      },
      (error: any) =>
        policy.rejected(error).catch((failure) => {
          if (failure.kind === 'forbidden')
            window.dispatchEvent(new Event('kubengine:permissions-stale'));
          throw failure;
        }),
    ],
  ],
  errorConfig: {
    errorHandler: (error: any, options: any) => {
      if (error?.kind === 'forbidden')
        window.dispatchEvent(new Event('kubengine:permissions-stale'));
      return policy.handle(error, options);
    },
  },
};
