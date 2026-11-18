import {
  ApiOutlined,
  DatabaseOutlined,
  HddOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Card, Progress } from 'antd';
import React from 'react';
import { DataPoint3 } from './data';

const icons = [ThunderboltOutlined, DatabaseOutlined, HddOutlined, ApiOutlined];
const labels = ['CPU 已请求', '内存已请求', '存储已使用', 'Pod 已分配'];
const DataPoint: React.FC<{
  dataSource?: DataPoint3;
  loading?: boolean;
  unit?: string;
  kind?: number;
}> = ({ dataSource, loading = false, unit = '', kind = 0 }) => {
  const valid =
    dataSource &&
    Number.isFinite(dataSource.total) &&
    Number.isFinite(dataSource.use);
  const percent =
    valid && dataSource.total > 0
      ? (dataSource.use / dataSource.total) * 100
      : 0;
  const Icon = icons[kind] || DatabaseOutlined;
  const format = (value: number) =>
    value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  return (
    <Card className="ke-metric" loading={loading}>
      <div className="ke-metric-label">
        <span>{dataSource?.name || labels[kind]}</span>
        <span className="ke-metric-icon">
          <Icon aria-hidden="true" />
        </span>
      </div>
      <div className="ke-metric-value">
        {valid ? format(dataSource.use) : '—'}
        <small>
          / {valid ? format(dataSource.total) : '—'} {unit}
        </small>
      </div>
      <Progress
        percent={Math.min(100, Math.max(0, percent))}
        showInfo={false}
        size="small"
        strokeColor={
          percent > 85 ? '#b76b08' : kind === 2 ? '#168568' : '#2563eb'
        }
        trailColor="#edf1f7"
        aria-label={`${dataSource?.name || labels[kind]}占比`}
      />
      <div className="ke-metric-meta">
        <span>{kind === 2 ? '存储使用率' : '资源分配率'}</span>
        <span className="ke-mono">
          {valid && dataSource.total > 0 ? `${percent.toFixed(2)}%` : '—'}
        </span>
      </div>
    </Card>
  );
};
export default DataPoint;
