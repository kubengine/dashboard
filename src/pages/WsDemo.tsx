import { DEFAULT_CONFIG } from '@/models/websocket';
import { useEffect, useState } from 'react';
import { useModel } from 'umi';
const WsDemo: React.FC = () => {
  // 消费 WebSocket Model
  const {
    readyState,
    readyStateText,
    messages,
    error,
    connect,
    sendMessage,
    close,
    clearMessages,
    setAutoReconnect,
    autoReconnect,
  } = useModel('websocket');

  // 页面交互状态
  const [message, setMessage] = useState('');

  // 组件卸载时清理资源（避免内存泄漏）
  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  const handleConnect = () => {
    connect();
  };

  // 发送消息
  const handleSend = () => {
    if (!message) return;
    sendMessage(message);
    setMessage('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>WebSocket 示例</h2>

      {/* 连接配置区域 */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={DEFAULT_CONFIG.url}
          disabled={true}
          placeholder="WebSocket 服务地址"
          style={{ flex: 1, padding: '8px' }}
        />
        <button onClick={handleConnect} style={{ padding: '8px 16px' }}>
          连接
        </button>
        <button onClick={() => close()} style={{ padding: '8px 16px' }}>
          关闭
        </button>
        <label>
          <input
            type="checkbox"
            checked={autoReconnect}
            onChange={(e) => setAutoReconnect(e.target.checked)}
          />
          自动重连
        </label>
      </div>

      {/* 状态展示区域 */}
      <div style={{ marginBottom: '20px' }}>
        <p>
          连接状态:{' '}
          <span style={{ color: readyState === 1 ? 'green' : 'red' }}>
            {readyStateText}
          </span>
        </p>
        {error && (
          <p style={{ color: 'red', margin: '5px 0' }}>错误: {error}</p>
        )}
      </div>

      {/* 消息发送区域 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入要发送的消息"
          style={{ flex: 1, padding: '8px' }}
        />
        <button onClick={handleSend} style={{ padding: '8px 16px' }}>
          发送
        </button>
        <button onClick={clearMessages} style={{ padding: '8px 16px' }}>
          清空消息
        </button>
      </div>

      {/* 消息列表区域 */}
      <div
        style={{
          border: '1px solid #eee',
          padding: '10px',
          height: '400px',
          overflow: 'auto',
          borderRadius: '4px',
        }}
      >
        <h4>消息记录</h4>
        {messages.length === 0 ? (
          <p style={{ color: '#999' }}>暂无消息</p>
        ) : (
          messages.map((item, index) => (
            <div
              key={index}
              style={{
                margin: '8px 0',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: item.type === 'send' ? '#f0f8ff' : '#f8f8f8',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>
                {item.type === 'send' ? '发送' : '接收'}:
              </div>
              <div>
                {typeof item.data === 'object'
                  ? JSON.stringify(item.data, null, 2)
                  : item.data}
              </div>
              <div
                style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}
              >
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WsDemo;
