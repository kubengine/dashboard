import { getBearerToken, isTokenExpired } from './auth';

interface Callbacks {
  status: (readyState: number, error?: string | null) => void;
  message: (data: unknown) => void;
  invalidSession: () => void;
}

/** 连接生命周期独立于 React 渲染；旧连接回调不能覆盖新连接。 */
export class SessionSocket {
  private socket: WebSocket | null = null;
  private bearer = '';
  private wanted = false;
  private autoReconnect = true;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private callbacks: Callbacks,
    private url = '/api/v1/ws',
    private interval = 2000,
  ) {}

  private clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private retire(code = 1000, reason = '') {
    this.clearTimer();
    const previous = this.socket;
    this.socket = null;
    this.bearer = '';
    previous?.close(code, reason);
  }

  private invalidate() {
    this.close();
    this.callbacks.invalidSession();
  }

  private reconnect() {
    this.clearTimer();
    if (this.wanted && this.autoReconnect) {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.wanted) this.connect();
      }, this.interval);
    }
  }

  connect = () => {
    this.wanted = true;
    if (this.socket) return;
    const bearer = getBearerToken();
    if (!bearer || isTokenExpired()) {
      this.invalidate();
      return;
    }
    this.clearTimer();
    try {
      const url = new URL(this.url, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('token', bearer);
      const socket = new WebSocket(url.toString());
      this.socket = socket;
      this.bearer = bearer;
      this.callbacks.status(WebSocket.CONNECTING, null);
      socket.onopen = () => {
        if (this.socket !== socket) return;
        this.clearTimer();
        this.callbacks.status(WebSocket.OPEN, null);
      };
      socket.onmessage = (event) => {
        if (this.socket !== socket) return;
        let data = event.data;
        try {
          data = JSON.parse(data);
        } catch {
          /* 支持纯文本消息。 */
        }
        this.callbacks.message(data);
      };
      socket.onclose = (event) => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.bearer = '';
        this.callbacks.status(WebSocket.CLOSED);
        if (event.code === 1008) {
          // 旧连接失效时，本地可能已取得另一个有效的续签令牌。
          if (
            getBearerToken() !== bearer &&
            getBearerToken() &&
            !isTokenExpired()
          ) {
            this.connect();
          } else {
            this.invalidate();
          }
          return;
        }
        this.reconnect();
      };
      socket.onerror = () => {
        if (this.socket === socket)
          this.callbacks.status(socket.readyState, '实时连接异常');
      };
    } catch {
      this.socket = null;
      this.callbacks.status(WebSocket.CLOSED, '无法建立实时连接');
      this.reconnect();
    }
  };

  refreshAuthentication = () => {
    if (!this.wanted) return;
    const bearer = getBearerToken();
    if (!bearer) {
      this.close();
    } else if (isTokenExpired()) {
      this.invalidate();
    } else if (bearer !== this.bearer) {
      this.retire();
      this.connect();
    }
  };

  send(data: unknown): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    try {
      this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch {
      this.callbacks.status(this.socket.readyState, '实时消息发送失败');
      return false;
    }
  }

  close = (code = 1000, reason = '') => {
    this.wanted = false;
    this.retire(code, reason);
    this.callbacks.status(WebSocket.CLOSED, null);
  };

  setAutoReconnect = (enabled: boolean) => {
    this.autoReconnect = enabled;
    if (!enabled) this.clearTimer();
    else if (!this.socket) this.reconnect();
  };
}
