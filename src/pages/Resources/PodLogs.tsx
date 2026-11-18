import { logs } from '@/services/KubernetesController';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Input,
  Select,
  Space,
  Switch,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export const downloadText = (name: string, text: string) => {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const PodLogs: React.FC<{ namespace: string; name: string; spec: any }> = ({
  namespace,
  name,
  spec,
}) => {
  const containers = useMemo(
    () => [
      ...(spec.containers || []).map((c: any) => ({
        value: c.name,
        label: c.name,
      })),
      ...(spec.initContainers || []).map((c: any) => ({
        value: c.name,
        label: `${c.name} · Init`,
      })),
      ...(spec.ephemeralContainers || []).map((c: any) => ({
        value: c.name,
        label: `${c.name} · 临时容器`,
      })),
    ],
    [spec],
  );
  const [container, setContainer] = useState(containers[0]?.value);
  const [tail, setTail] = useState(200);
  const [since, setSince] = useState(3600);
  const [previous, setPrevious] = useState(false);
  const [timestamps, setTimestamps] = useState(true);
  const [auto, setAuto] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [updated, setUpdated] = useState('');
  const lastQuery = useRef('');
  useEffect(() => {
    if (!container) return;
    const controller = new AbortController();
    const key = JSON.stringify([
      namespace,
      name,
      container,
      tail,
      since,
      previous,
      timestamps,
    ]);
    if (key !== lastQuery.current) {
      setText('');
      setUpdated('');
      lastQuery.current = key;
    }
    setLoading(true);
    setError('');
    setTruncated(false);
    logs(
      namespace,
      name,
      {
        container,
        tail_lines: tail,
        since_seconds: since || undefined,
        previous,
        timestamps,
      },
      controller.signal,
    )
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (code != 200) throw new Error(message || '日志读取失败');
        setText(data.logs || '');
        setTruncated(data.truncated);
        setUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message || '无法读取日志');
          setAuto(false);
          setText('');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [namespace, name, container, tail, since, previous, timestamps, refresh]);
  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => setRefresh((v) => v + 1), 5000);
    return () => window.clearInterval(timer);
  }, [auto]);
  const visible = filter
    ? text
        .split('\n')
        .filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
        .join('\n')
    : text;
  return (
    <div className="ke-pod-logs">
      <div className="ke-resource-toolbar">
        <div>
          <label htmlFor="log-container">容器</label>
          <Select
            id="log-container"
            aria-label="日志容器"
            value={container}
            options={containers}
            onChange={setContainer}
            style={{ minWidth: 240 }}
          />
        </div>
        <div>
          <label htmlFor="log-time">时间范围</label>
          <Select
            id="log-time"
            aria-label="日志时间范围"
            value={since}
            onChange={setSince}
            options={[
              { value: 600, label: '最近 10 分钟' },
              { value: 3600, label: '最近 1 小时' },
              { value: 86400, label: '最近 24 小时' },
              { value: 0, label: '所有可用日志' },
            ]}
          />
        </div>
        <div>
          <label htmlFor="log-tail">日志行数</label>
          <Select
            id="log-tail"
            aria-label="日志行数"
            value={tail}
            onChange={setTail}
            options={[200, 500, 1000, 2000].map((value) => ({
              value,
              label: `最近 ${value} 行`,
            }))}
          />
        </div>
      </div>
      <div className="ke-log-options">
        <Space wrap>
          <Checkbox
            checked={previous}
            onChange={(e) => setPrevious(e.target.checked)}
          >
            上一次容器日志
          </Checkbox>
          <Checkbox
            checked={timestamps}
            onChange={(e) => setTimestamps(e.target.checked)}
          >
            时间戳
          </Checkbox>
          <Switch
            checked={auto}
            onChange={setAuto}
            aria-label="每 5 秒刷新日志"
          />
          <span>5 秒刷新</span>
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined aria-hidden="true" />}
            loading={loading}
            onClick={() => setRefresh((v) => v + 1)}
          >
            刷新日志
          </Button>
          <Button
            icon={<DownloadOutlined aria-hidden="true" />}
            disabled={!text}
            onClick={() =>
              downloadText(
                `${name}-${container}${previous ? '-previous' : ''}.log`,
                text,
              )
            }
          >
            下载日志
          </Button>
        </Space>
      </div>
      <Input.Search
        aria-label="筛选日志内容"
        placeholder="筛选当前日志内容"
        allowClear
        onChange={(e) => setFilter(e.target.value)}
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message="日志读取失败"
          description={error}
          action={
            <Button onClick={() => setRefresh((v) => v + 1)}>重试</Button>
          }
        />
      )}
      {truncated && (
        <Alert
          type="warning"
          showIcon
          message="本次响应已达到 1 MiB 上限，请缩小时间范围或减少行数。"
        />
      )}
      <div className="ke-log-status" role="status">
        {loading
          ? '正在读取日志…'
          : `${updated ? `更新于 ${updated} · ` : ''}${
              filter ? '筛选后 ' : ''
            }${visible ? visible.split('\n').length : 0} 行`}
      </div>
      {visible ? (
        <pre className="ke-log-view" tabIndex={0} aria-label="容器日志内容">
          {visible}
        </pre>
      ) : !loading && !error ? (
        <Empty description={filter ? '没有匹配的日志行' : '所选范围暂无日志'} />
      ) : (
        <div className="ke-log-placeholder" />
      )}
      <p className="ke-resource-secondary">
        日志来自 Kubernetes Pod 日志接口，每次最多 2000 行、1
        MiB。上一次日志仅在容器发生过重启且日志仍被节点保留时可用。
      </p>
    </div>
  );
};
export default PodLogs;
