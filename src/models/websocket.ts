import { getBearerToken } from '@/utils/auth';
import { useState, useRef, useEffect } from 'react';

// WebSocket 核心状态类型定义
type WSState = {
  // 连接状态: 0-连接中 1-已打开 2-正在关闭 3-已关闭 (对齐 WebSocket 标准状态码)
  readyState: number;
  // 消息列表（区分发送/接收）
  messages: Array<{
    type: 'send' | 'receive';
    data: any;
    timestamp: number;
  }>;
  // 错误信息
  error: string | null;
  // 是否开启自动重连
  autoReconnect: boolean;
  // 重连间隔(毫秒)
  reconnectInterval: number;
};

// WebSocket 操作方法类型定义
type WSActions = {
  // 连接 WebSocket
  connect: () => void;
  // 发送消息
  sendMessage: (data: any) => void;
  // 关闭连接
  close: (code?: number, reason?: string) => void;
  // 清空消息记录
  clearMessages: () => void;
  // 切换自动重连
  setAutoReconnect: (autoReconnect: boolean) => void;
};

// 默认配置
export const DEFAULT_CONFIG = {
  autoReconnect: true,
  reconnectInterval: 2000,
  url: "/api/v1/ws",
};


// Umi 函数式 Model 核心逻辑
export default function () {
  // 初始化状态
  const [state, setState] = useState<WSState>({
    readyState: WebSocket.CLOSED,
    messages: [],
    error: null,
    autoReconnect: DEFAULT_CONFIG.autoReconnect,
    reconnectInterval: DEFAULT_CONFIG.reconnectInterval,
  });

  // 核心引用（避免重渲染丢失实例）
  const socketRef = useRef<WebSocket | null>(null); // WebSocket 实例
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null); // 重连定时器
  const currentUrlRef = useRef<string>(DEFAULT_CONFIG.url); // 当前连接的 URL

  // 清理重连定时器
  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  // 自动重连逻辑
  const reconnect = () => {
    if (!state.autoReconnect || !currentUrlRef.current) return;
    clearReconnectTimer();
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, state.reconnectInterval);
  };

  // 建立 WebSocket 连接
  const connect: WSActions['connect'] = () => {
    // // 关闭已有连接
    // if (socketRef.current) {
    //   socketRef.current.close();
    //   socketRef.current = null;
    // }
    if (socketRef.current) {
      return
    }

    // 记录当前连接信息
    currentUrlRef.current = DEFAULT_CONFIG.url;

    try {
      // 创建 WebSocket 实例
      const bearerToken = getBearerToken();
      const socket = new WebSocket(`${DEFAULT_CONFIG.url}?token=${encodeURIComponent(bearerToken)}`);
      socketRef.current = socket;

      // 更新连接状态为「连接中」
      setState(prev => ({
        ...prev,
        readyState: WebSocket.CONNECTING,
        error: null,
      }));

      // 连接成功回调
      socket.onopen = () => {
        console.log('[WebSocket] 连接成功');
        setState(prev => ({
          ...prev,
          readyState: WebSocket.OPEN,
          error: null,
        }));
        clearReconnectTimer(); // 连接成功后清空重连定时器
      };

      // 接收消息回调
      socket.onmessage = (event) => {
        let data = event.data;
        try {
          // 尝试解析 JSON 格式消息（兼容 Umi HMR 消息格式）
          data = JSON.parse(data);
        } catch (e) {
          // 非 JSON 消息直接使用原始值
        }
        // 记录接收的消息
        setState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            { type: 'receive', data, timestamp: Date.now() },
          ],
        }));
      };

      // 连接关闭回调
      socket.onclose = (event) => {
        console.log(`[WebSocket] 连接关闭: code=${event.code}, reason=${event.reason}`);
        setState(prev => ({ ...prev, readyState: WebSocket.CLOSED }));
        reconnect(); // 触发自动重连
      };

      // 错误回调
      socket.onerror = (error) => {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        console.error('[WebSocket] 错误:', errorMsg);
        setState(prev => ({ ...prev, error: errorMsg }));
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '创建 WebSocket 实例失败';
      setState(prev => ({
        ...prev,
        readyState: WebSocket.CLOSED,
        error: errorMsg,
      }));
    }
  };
  // 发送消息
  const sendMessage: WSActions['sendMessage'] = (data) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'WebSocket 未连接或连接未打开' }));
      return;
    }

    try {
      // 序列化消息（兼容 Umi HMR 字符串格式）
      const sendData = typeof data === 'string' ? data : JSON.stringify(data);
      socket.send(sendData);

      // 记录发送的消息
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, { type: 'send', data, timestamp: Date.now() }],
        error: null,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '发送消息失败';
      setState(prev => ({ ...prev, error: errorMsg }));
    }
  };

  // 关闭连接
  const close: WSActions['close'] = (code, reason) => {
    clearReconnectTimer(); // 关闭时取消自动重连
    const socket = socketRef.current;
    if (socket) {
      socket.close(code, reason);
      socketRef.current = null;
    }
    setState(prev => ({ ...prev, readyState: WebSocket.CLOSED }));
  };

  // 清空消息记录
  const clearMessages: WSActions['clearMessages'] = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  // 切换自动重连
  const setAutoReconnect: WSActions['setAutoReconnect'] = (autoReconnect) => {
    setState((prev) => ({ ...prev, autoReconnect }));
    // 开启重连且当前未连接时，主动触发重连
    if (autoReconnect && state.readyState === WebSocket.CLOSED && currentUrlRef.current) {
      reconnect();
    }
  };

  // 组件卸载时清理资源（避免内存泄漏）
  useEffect(() => {
    return () => {
      close();
      clearReconnectTimer();
    };
  }, []);

  // 返回状态和方法（供 useModel 消费）
  return {
    ...state,
    connect,
    sendMessage,
    close,
    clearMessages,
    setAutoReconnect,
    // 辅助状态：连接状态文本化（便于页面展示）
    readyStateText: ['连接中', '已打开', '正在关闭', '已关闭'][state.readyState],
  };
}