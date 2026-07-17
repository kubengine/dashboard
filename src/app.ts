import { history } from '@umijs/max';
import type {
  RequestConfig,
  RequestOptions,
  RunTimeLayoutConfig,
} from '@umijs/max';
import { message, notification } from 'antd';
import { clearAuthStore, getAKSK, getAuthStore, getBearerToken, isTokenExpired, saveToken } from './utils/auth';
import { getNonce, getTimestamp, signAKSK } from './utils/aksk';

const loginPath = '/user/login';

// 初始化状态获取用户信息
export async function getInitialState() {
  const authStore = getAuthStore();
  return {
    avatar: "/assets/logo.png",
    user: {
      authType: authStore.authType,
      tokenExpiresAt: authStore.token?.expiresAt || '',
      ak: authStore.aksk?.ak || '',
      accessToken: authStore.token?.accessToken || '',
    },
  };
}

// 布局配置实现登录拦截
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  return {
    title: 'kubengine',
    logo: '/assets/logo.png',
    // 页面切换时检查登录状态
    onPageChange: () => {
      const { pathname } = location;
      // 忽略登录页和白名单
      const whiteList = [loginPath];
      if (whiteList.includes(pathname)) return;

      const { authType } = getAuthStore();
      // Token 鉴权：检查有效性
      if (authType === 'token' && (isTokenExpired() || !getAuthStore().token?.accessToken)) {
        clearAuthStore();
        history.push(loginPath);
        return;
      }

      // AKSK 鉴权：检查 AK/SK
      if (authType === 'aksk' && !getAuthStore().aksk?.ak) {
        clearAuthStore();
        history.push(loginPath);
        return;
      }

      const authStore = getAuthStore();
      if (authType === 'token' && initialState?.user.accessToken != authStore.token?.accessToken) {
        setInitialState((prevState) => ({
          avatar: prevState?.avatar || "/assets/logo.png",
          user: {
            authType: authStore.authType,
            tokenExpiresAt: authStore.token?.expiresAt || '',
            ak: authStore.aksk?.ak || '',
            accessToken: authStore.token?.accessToken || '',
          },
        }));
      }
    },
    logout() {
      setInitialState(undefined)
      clearAuthStore();
      history.push(loginPath);
    },
  };
};

export const request: RequestConfig = {
  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 添加 token 认证
      const { authType } = getAuthStore();

      // 1. Token 鉴权：注入 Authorization Header
      if (authType === 'token') {
        const bearerToken = getBearerToken();
        config.headers = {
          ...config.headers,
          Authorization: bearerToken,
        };
      }

      // 2. AKSK 鉴权：注入 AK/SK 相关 Header（自动生成签名）
      if (authType === 'aksk') {
        const akskInfo = getAKSK();
        if (akskInfo?.ak && akskInfo?.sk) {
          const timestamp = getTimestamp(); // 格式：20251209100000
          const nonce = getNonce(); // 随机字符串
          const signature = signAKSK({
            ak: akskInfo.ak,
            sk: akskInfo.sk,
            timestamp,
            nonce,
          });
          config.headers = {
            ...config.headers,
            ak: akskInfo.ak,
            timestamp: akskInfo.sk,
            nonce: nonce,
            signature: signature,
          }
        }
      }
      return config;
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    async (response: any) => {
      const { data, status } = response
      // 1. 检测到新 Token，自动更新本地存储
      if (data.new_access_token != null && data.token_type) {
        const { token: oldToken } = getAuthStore();
        // 保存新 Token
        saveToken({
          accessToken: data.new_access_token,
          tokenType: data.token_type,
          expiresAt: oldToken?.expiresAt || new Date(Date.now() + 120 * 60 * 1000).toISOString(),
          username: oldToken?.username || '',
        });
      }

      // 2. 业务异常处理（非 200 业务码）
      if (status !== 200) {
        message.error(data.message || '操作失败');
        // 401 登出
        if (status === 401) {
          clearAuthStore();
          history.push(loginPath);
        }
      }
      return response;
    }
  ],
  errorConfig: {
    errorThrower: (res) => {
      const { code } = res as { code: number };
      if (code !== 200) {
        throw new Error(res.message);
      }
    },
    errorHandler: (error: any) => {
      const { response } = error
      if (response) {
        // HTTP 401：Token 过期/鉴权失败
        if (response.status === 401) {
          if (response.config.url == "/api/v1/login") {
            notification.error({
              message: '登录失败',
              description: response.data.message,
            });
          } else {
            clearAuthStore();
            notification.error({
              message: '鉴权失败',
              description: 'Token 已过期或无效，请重新登录',
            });
            // 避免重复跳转
            if (history.location.pathname !== loginPath) {
              history.push(loginPath);
            }
          }
        } else if (response.status === 403) {
          // HTTP 403：权限不足
          notification.error({
            message: '权限不足',
            description: '你没有权限访问该接口，请联系管理员',
          });
        } else if (response.status === 500) {
          // HTTP 500：服务器错误
          notification.error({
            message: '服务器错误',
            description: '服务器内部异常，请稍后重试',
          });
        } else {
          // 网络错误（无响应）
          notification.error({
            message: '网络异常',
            description: '无法连接到服务器，请检查网络',
          });
        }
      }
      return Promise.reject(error)
    },
  }
};
