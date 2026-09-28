import {
  clearAuthStore,
  getBearerToken,
  subscribeAuthChanges,
} from '@/utils/auth';
import { SessionSocket } from '@/utils/websocketClient';
import { history } from '@umijs/max';
import { useEffect, useRef, useState } from 'react';

export const DEFAULT_CONFIG = {
  autoReconnect: true,
  reconnectInterval: 2000,
  url: '/api/v1/ws',
};

type Message = { type: 'send' | 'receive'; data: any; timestamp: number };

export default function () {
  const [state, setState] = useState({
    readyState: WebSocket.CLOSED as number,
    messages: [] as Message[],
    error: null as string | null,
    autoReconnect: DEFAULT_CONFIG.autoReconnect,
    reconnectInterval: DEFAULT_CONFIG.reconnectInterval,
  });
  const clientRef = useRef<SessionSocket | null>(null);
  const appendMessage = (type: Message['type'], data: any) =>
    setState((previous) => ({
      ...previous,
      messages: [
        ...previous.messages.slice(-199),
        { type, data, timestamp: Date.now() },
      ],
    }));
  if (!clientRef.current) {
    clientRef.current = new SessionSocket(
      {
        status: (readyState, error) =>
          setState((previous) => ({
            ...previous,
            readyState,
            ...(error === undefined ? {} : { error }),
          })),
        message: (data) => appendMessage('receive', data),
        invalidSession: () => {
          clearAuthStore();
          if (history.location.pathname !== '/user/login')
            history.replace('/user/login');
        },
      },
      DEFAULT_CONFIG.url,
      DEFAULT_CONFIG.reconnectInterval,
    );
  }
  const client = clientRef.current;
  useEffect(() => {
    const unsubscribe = subscribeAuthChanges(() => {
      client.refreshAuthentication();
      if (!getBearerToken())
        setState((previous) => ({ ...previous, messages: [] }));
    });
    return () => {
      unsubscribe();
      client.close();
    };
  }, [client]);

  return {
    ...state,
    connect: client.connect,
    close: client.close,
    sendMessage: (data: any) => {
      if (client.send(data)) appendMessage('send', data);
      else
        setState((previous) => ({
          ...previous,
          error: 'WebSocket 未连接或消息发送失败',
        }));
    },
    clearMessages: () =>
      setState((previous) => ({ ...previous, messages: [] })),
    setAutoReconnect: (enabled: boolean) => {
      client.setAutoReconnect(enabled);
      setState((previous) => ({ ...previous, autoReconnect: enabled }));
    },
    readyStateText: ['连接中', '已打开', '正在关闭', '已关闭'][
      state.readyState
    ],
  };
}
