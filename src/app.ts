import type {
  RequestConfig,
  RequestOptions,
  RunTimeLayoutConfig,
} from '@umijs/max';
import { history } from '@umijs/max';
import { notification } from 'antd';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import { cloneElement, createElement, isValidElement } from 'react';
import Brand from './components/Brand';
import {
  ConsoleFooter,
  ConsoleHeader,
  WorkspaceLabel,
} from './components/ConsoleChrome';
import { logout } from './services/UserController';
import {
  clearAuthStore,
  endSession,
  getAuthStore,
  getBearerToken,
  isTokenExpired,
  renewToken,
} from './utils/auth';

const loginPath = '/user/login';
const redirectToLogin = () => {
  if (history.location.pathname !== loginPath) history.replace(loginPath);
};
const requestBearer = (config: any): string => {
  const headers = config?.headers;
  // Axios 0.x uses headers.get for GET defaults; it is not a getter method.
  const fromGetter =
    typeof headers?.get === 'function'
      ? headers.get('Authorization')
      : undefined;
  const bearer = fromGetter || headers?.Authorization || headers?.authorization;
  return typeof bearer === 'string' ? bearer : '';
};

export async function getInitialState() {
  const store = getAuthStore();
  return {
    avatar: '/assets/kubeengine-mark.svg',
    user: {
      authType: 'token' as const,
      tokenExpiresAt: store.token?.expiresAt || '',
      accessToken: store.token?.accessToken || '',
    },
  };
}

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const handleLogout = async () => {
    try {
      await endSession((bearer) => logout(bearer));
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        notification.warning({
          message: '已退出本地登录',
          description: '服务端令牌撤销未成功，请检查网络；原令牌可能仍然有效。',
        });
      }
    } finally {
      // Other tabs may have started a different login while this request waited.
      if (!getAuthStore().token) {
        setInitialState(undefined);
        redirectToLogin();
      }
    }
  };
  return {
    title: false,
    logo: '/assets/kubeengine-mark.svg',
    layout: 'side',
    navTheme: 'light',
    siderWidth: 232,
    headerHeight: 64,
    contentWidth: 'Fluid',
    menu: { defaultOpenAll: true, ignoreFlatMenu: true },
    collapsedButtonRender: (collapsed, dom) =>
      isValidElement<HTMLAttributes<HTMLElement>>(dom)
        ? cloneElement(dom, {
            role: 'button',
            tabIndex: 0,
            'aria-label': collapsed ? '展开导航' : '折叠导航',
            'aria-expanded': !collapsed,
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.currentTarget.click();
              }
            },
          })
        : dom,
    headerRender: (props) =>
      createElement(ConsoleHeader, {
        onLogout: handleLogout,
        onToggleMenu: () => props.onCollapse?.(!props.collapsed),
      }),
    rightContentRender: false,
    menuExtraRender: (props) =>
      createElement(WorkspaceLabel, { collapsed: props?.collapsed }),
    menuFooterRender: (props) =>
      createElement(ConsoleFooter, { collapsed: props?.collapsed }),
    token: {
      bgLayout: '#f4f7fb',
      sider: {
        colorMenuBackground: '#101e34',
        colorTextMenu: '#aebdd2',
        colorTextMenuSecondary: '#aebdd2',
        colorTextMenuSelected: '#ffffff',
        colorBgMenuItemSelected: '#253e64',
        colorBgMenuItemHover: '#1a304d',
        colorTextMenuActive: '#ffffff',
        colorBgCollapsedButton: '#ffffff',
        colorTextCollapsedButton: '#596b83',
      },
      pageContainer: {
        paddingInlinePageContainerContent: 0,
        paddingBlockPageContainerContent: 0,
      },
    },
    menuHeaderRender: (_logo, _title, props) =>
      createElement(
        'a',
        { href: '/home', 'aria-label': '返回资源总览' },
        createElement(Brand, { collapsed: props?.collapsed, light: true }),
      ),
    childrenRender: (children) =>
      createElement(
        'div',
        { className: 'ke-workbench' },
        createElement(
          'div',
          { className: 'ke-desktop-header' },
          createElement(ConsoleHeader, { onLogout: handleLogout }),
        ),
        createElement(
          'div',
          { id: 'ke-main', className: 'ke-main', tabIndex: -1 },
          children,
        ),
      ),
    onPageChange: () => {
      if (history.location.pathname === loginPath) return;
      if (isTokenExpired()) {
        clearAuthStore();
        redirectToLogin();
        return;
      }
      const store = getAuthStore();
      if (initialState?.user.accessToken !== store.token?.accessToken) {
        setInitialState({
          avatar: initialState?.avatar || '/assets/kubeengine-mark.svg',
          user: {
            authType: 'token',
            tokenExpiresAt: store.token?.expiresAt || '',
            accessToken: store.token?.accessToken || '',
          },
        });
      }
    },
    logout: handleLogout,
  };
};

export const request: RequestConfig = {
  requestInterceptors: [
    (config: RequestOptions) => {
      const bearer = getBearerToken();
      if (
        config.url?.startsWith('/api/') &&
        config.url !== '/api/v1/login' &&
        bearer &&
        !requestBearer(config)
      ) {
        config.headers = { ...config.headers, Authorization: bearer };
      }
      return config;
    },
  ],
  responseInterceptors: [
    (response: any) => {
      const data = response.data;
      if (
        response.status === 200 &&
        typeof data?.new_access_token === 'string' &&
        data.token_type
      ) {
        renewToken(
          requestBearer(response.config),
          data.new_access_token,
          data.token_type,
        );
      }
      return response;
    },
  ],
  errorConfig: {
    errorThrower: (res) => {
      // Login deliberately returns its token object without the API envelope.
      if (typeof res.code === 'number' && res.code !== 200)
        throw new Error(res.message);
    },
    errorHandler: (error: any, options: any) => {
      if (options?.skipErrorHandler) throw error;
      const response = error.response;
      if (response?.status === 401) {
        if (response.config?.url === '/api/v1/login') {
          notification.error({
            message: '登录失败',
            description: response.data?.message || '用户名或密码错误',
          });
        } else {
          // A late 401 for an older token must not clear a newer login/renewal.
          const sent = requestBearer(response.config);
          const current = getBearerToken();
          if (!current || (sent && sent === current)) {
            clearAuthStore();
            notification.error({
              message: '登录已失效',
              description: '请重新登录',
            });
            redirectToLogin();
          }
        }
      } else if (response?.status === 403) {
        notification.error({
          message: '权限不足',
          description: '你没有权限访问该接口',
        });
      } else {
        notification.error({
          message: response ? '操作失败' : '网络异常',
          description:
            response?.data?.message ||
            error.message ||
            '无法连接到服务器，请检查网络',
        });
      }
      throw error;
    },
  },
};
