import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { notification } from 'antd';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import { cloneElement, createElement, isValidElement } from 'react';
import AuthorizationBoundary from './components/AuthorizationBoundary';
import Brand from './components/Brand';
import {
  ConsoleFooter,
  ConsoleHeader,
  WorkspaceLabel,
} from './components/ConsoleChrome';
import { current_user } from './services/IdentityController';
import { logout } from './services/UserController';
import { endSession, getAuthStore, isTokenExpired } from './utils/auth';
import { requireLogin } from './utils/request';

const loginPath = '/user/login';
const redirectToLogin = () => {
  if (history.location.pathname !== loginPath) history.replace(loginPath);
};

export async function getInitialState() {
  const store = getAuthStore();
  return {
    currentUser: !isTokenExpired()
      ? await current_user().catch(() => undefined)
      : undefined,
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
        AuthorizationBoundary,
        null,
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
      ),
    onPageChange: () => {
      if (history.location.pathname === loginPath) return;
      if (isTokenExpired()) {
        requireLogin();
        return;
      }
      if (
        initialState?.currentUser &&
        initialState.currentUser.role !== 'platform_admin' &&
        /^\/(home|nodeDetail|apps|artifacts|admin)(\/|$)/.test(
          history.location.pathname,
        )
      ) {
        history.replace('/resources/pod');
        return;
      }
      const store = getAuthStore();
      if (initialState?.user.accessToken !== store.token?.accessToken) {
        setInitialState({
          ...initialState,
          currentUser: initialState?.currentUser,
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

export { requestConfig as request } from './utils/request';
