import { terminal_url } from '@/services/PodOperationsController';
import { getBearerToken, subscribeAuthChanges } from '@/utils/auth';
import {
  ClearOutlined,
  DisconnectOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { Alert, Button, Select, Space, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const PodTerminal: React.FC<{
  namespace: string;
  name: string;
  container: string;
  windows?: boolean;
}> = ({ namespace, name, container, windows }) => {
  const element = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal>();
  const fit = useRef<FitAddon>();
  const socket = useRef<WebSocket>();
  const [shell, setShell] = useState(windows ? 'powershell' : 'sh');
  const [state, setState] = useState<
    'idle' | 'connecting' | 'ready' | 'closed'
  >('idle');
  const [error, setError] = useState('');
  const [exit, setExit] = useState('');
  const send = (value: any) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(value));
  };
  const disconnect = () => {
    const previous = socket.current;
    socket.current = undefined;
    previous?.close();
    setState('closed');
    if (term.current) term.current.options.disableStdin = true;
  };
  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      disableStdin: true,
      fontSize: 13,
      fontFamily: 'Consolas, "Liberation Mono", monospace',
      scrollback: 3000,
      screenReaderMode: true,
      theme: {
        background: '#101e34',
        foreground: '#e6edf7',
        cursor: '#93c5fd',
      },
    });
    const addon = new FitAddon();
    terminal.loadAddon(addon);
    terminal.open(element.current!);
    addon.fit();
    const input = terminal.onData((data) => {
      if (
        socket.current?.readyState !== WebSocket.OPEN ||
        terminal.options.disableStdin
      )
        return;
      for (let offset = 0; offset < data.length; offset += 8000)
        send({ type: 'input', data: data.slice(offset, offset + 8000) });
    });
    const resize = terminal.onResize(({ cols, rows }) =>
      send({
        type: 'resize',
        cols: Math.max(20, Math.min(cols, 500)),
        rows: Math.max(5, Math.min(rows, 300)),
      }),
    );
    const observer = new ResizeObserver(() => {
      if (element.current?.clientWidth) addon.fit();
    });
    observer.observe(element.current!);
    term.current = terminal;
    fit.current = addon;
    const unsubscribe = subscribeAuthChanges(() => {
      const token = getBearerToken();
      if (!token) disconnect();
      else send({ type: 'auth', token });
    });
    return () => {
      unsubscribe();
      observer.disconnect();
      input.dispose();
      resize.dispose();
      const previous = socket.current;
      socket.current = undefined;
      previous?.close();
      terminal.dispose();
      term.current = undefined;
      fit.current = undefined;
    };
  }, []);
  const connect = () => {
    disconnect();
    setState('connecting');
    setError('');
    setExit('');
    const terminal = term.current!;
    terminal.reset();
    terminal.options.disableStdin = true;
    const current = new WebSocket(
      terminal_url(namespace, name, container, shell),
    );
    socket.current = current;
    let pending = 0;
    current.onopen = () => {
      if (socket.current !== current) return;
      current.send(JSON.stringify({ type: 'auth', token: getBearerToken() }));
    };
    current.onmessage = (event) => {
      if (socket.current !== current) return;
      let value: any;
      try {
        value = JSON.parse(event.data);
      } catch {
        setError('终端响应无效');
        disconnect();
        return;
      }
      if (value.type === 'ready') {
        setState('ready');
        terminal.options.disableStdin = false;
        fit.current?.fit();
        send({
          type: 'resize',
          cols: Math.max(20, Math.min(terminal.cols, 500)),
          rows: Math.max(5, Math.min(terminal.rows, 300)),
        });
        terminal.focus();
      } else if (value.type === 'output' && typeof value.data === 'string') {
        const data =
          value.encoding === 'base64'
            ? Uint8Array.from(atob(value.data), (char) => char.charCodeAt(0))
            : value.data;
        pending += data.length;
        if (pending > 2 * 1024 * 1024) {
          setError('终端输出过快，连接已关闭，请重新连接');
          disconnect();
          return;
        }
        terminal.write(data, () => {
          pending -= data.length;
        });
      } else if (value.type === 'error') {
        setError(value.message || '终端连接失败');
      } else if (value.type === 'exit') {
        setExit(
          `会话已结束${value.code == null ? '' : `，退出码 ${value.code}`}`,
        );
        terminal.options.disableStdin = true;
      }
    };
    current.onerror = () => {
      if (socket.current === current)
        setError('终端连接失败，请检查容器状态与 exec 权限');
    };
    current.onclose = () => {
      if (socket.current !== current) return;
      socket.current = undefined;
      terminal.options.disableStdin = true;
      setState('closed');
    };
  };
  const active = state === 'connecting' || state === 'ready';
  return (
    <div className="ke-pod-terminal">
      <div className="ke-pod-tools-toolbar">
        <Space wrap>
          <label htmlFor="pod-shell">Shell</label>
          <Select
            id="pod-shell"
            aria-label="终端 Shell"
            value={shell}
            disabled={active}
            onChange={setShell}
            options={[
              { value: 'sh', label: 'sh' },
              { value: 'bash', label: 'Bash' },
              { value: 'powershell', label: 'PowerShell' },
            ]}
            style={{ width: 150 }}
          />
          <Button
            type="primary"
            icon={<LinkOutlined aria-hidden="true" />}
            disabled={active}
            onClick={connect}
          >
            连接终端
          </Button>
          <Button
            icon={<DisconnectOutlined aria-hidden="true" />}
            disabled={!active}
            onClick={disconnect}
          >
            断开
          </Button>
          <Tag
            color={
              state === 'ready'
                ? 'success'
                : state === 'connecting'
                ? 'processing'
                : 'default'
            }
          >
            {state === 'ready'
              ? '已连接'
              : state === 'connecting'
              ? '连接中'
              : state === 'closed'
              ? '已断开'
              : '未连接'}
          </Tag>
        </Space>
        <Space>
          <Button
            disabled={state !== 'ready'}
            onClick={() => send({ type: 'input', data: '\u0003' })}
          >
            Ctrl+C
          </Button>
          <Button
            icon={<ClearOutlined aria-hidden="true" />}
            onClick={() => term.current?.clear()}
          >
            清屏
          </Button>
        </Space>
      </div>
      {error && <Alert type="error" showIcon message={error} />}
      {exit && <Alert type="info" showIcon message={exit} />}
      <div
        ref={element}
        className="ke-terminal-screen"
        role="region"
        aria-label="Pod 交互终端"
      />
      <p className="ke-resource-secondary">
        支持交互输入、粘贴、Ctrl+C 和自适应窗口。Shell
        需已安装在所选容器内；PowerShell 在 Linux 容器使用 pwsh，在 Windows
        容器使用 powershell.exe。
      </p>
    </div>
  );
};
export default PodTerminal;
