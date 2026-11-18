import { KubernetesNodeData } from '@/components/data';
import Labels from '@/components/Labels';
import { formatBytes } from '@/utils/storage';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Link } from '@umijs/max';
import { Card, Empty, Input, Progress, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';

const Allocation: React.FC<{ value: string; percent: number }> = ({
  value,
  percent,
}) => (
  <div className="ke-node-allocation">
    <div>
      <span className="ke-mono">{value}</span>
      <span className="ke-section-caption">
        {Number(percent || 0).toFixed(1)}%
      </span>
    </div>
    <Progress
      percent={Math.max(0, Math.min(100, percent || 0))}
      size="small"
      strokeColor={percent > 85 ? '#b76b08' : '#4982ed'}
      showInfo={false}
    />
  </div>
);
const bytes = (value: number) => {
  const data = formatBytes(value);
  return `${data.value} ${data.unit}`;
};
const NodesTable: React.FC<{
  dataSource?: KubernetesNodeData[];
  loading?: boolean;
  title?: string;
}> = ({ dataSource = [], loading = false, title = '节点资源' }) => {
  const [search, setSearch] = useState('');
  const rows = useMemo(
    () =>
      dataSource.filter((row) =>
        row.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [dataSource, search],
  );
  const columns = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      width: 195,
      render: (name: string, row: KubernetesNodeData) => (
        <div>
          <Link
            className="ke-node-name"
            to={`/nodeDetail?name=${encodeURIComponent(name)}`}
          >
            {name}
          </Link>
          <div className="ke-node-sub">
            {row.labels?.['kubernetes.io/arch'] || '—'} /{' '}
            {row.labels?.['kubernetes.io/os'] || '—'}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'ready',
      key: 'ready',
      width: 110,
      render: (ready: boolean) => (
        <Tag
          icon={
            ready ? (
              <CheckCircleOutlined aria-hidden="true" />
            ) : (
              <ClockCircleOutlined aria-hidden="true" />
            )
          }
          color={ready ? 'success' : 'warning'}
        >
          {ready ? '已就绪' : '未就绪'}
        </Tag>
      ),
    },
    {
      title: 'CPU 请求 / 容量',
      key: 'cpu',
      width: 185,
      render: (_: unknown, row: KubernetesNodeData) => (
        <Allocation
          value={`${(row.cpuRequests / 1000).toFixed(2)} / ${
            row.cpuCapacity / 1000
          } 核`}
          percent={row.cpuRequestsFraction}
        />
      ),
    },
    {
      title: '内存请求 / 容量',
      key: 'memory',
      width: 195,
      render: (_: unknown, row: KubernetesNodeData) => (
        <Allocation
          value={`${bytes(row.memoryRequests)} / ${bytes(row.memoryCapacity)}`}
          percent={row.memoryRequestsFraction}
        />
      ),
    },
    {
      title: '已分配 Pod',
      key: 'pods',
      width: 145,
      render: (_: unknown, row: KubernetesNodeData) => (
        <Allocation
          value={`${row.allocatedPods} 个`}
          percent={row.podFraction}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'creationTimestamp',
      key: 'creationTimestamp',
      width: 150,
      render: (value: string) => (
        <span className="ke-section-caption">
          {dayjs(value).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
  ];
  return (
    <Card
      className="ke-nodes"
      title={
        <div className="ke-node-title">
          <span>{title}</span>
          <Tag>{dataSource.length}</Tag>
        </div>
      }
      extra={
        <Input
          aria-label="搜索节点"
          size="small"
          placeholder="搜索节点名称"
          prefix={<SearchOutlined aria-hidden="true" />}
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 170 }}
        />
      }
    >
      <Table
        rowKey="name"
        dataSource={rows}
        columns={columns}
        loading={loading}
        pagination={false}
        scroll={{ x: 1020 }}
        size="middle"
        locale={{
          emptyText: (
            <Empty
              description={search ? '未找到匹配的节点' : '暂无节点数据'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        expandable={{
          expandedRowRender: (row) => (
            <div className="ke-node-details">
              <p>
                CPU 限制
                <strong>
                  {row.cpuLimits / 1000} 核（{row.cpuLimitsFraction}%）
                </strong>
              </p>
              <p>
                内存限制
                <strong>
                  {bytes(row.memoryLimits)}（{row.memoryLimitsFraction}%）
                </strong>
              </p>
              <p>
                CPU / 内存容量
                <strong>
                  {row.cpuCapacity / 1000} 核 / {bytes(row.memoryCapacity)}
                </strong>
              </p>
              <div className="ke-node-labels">
                <p style={{ marginBottom: 8 }}>节点标签</p>
                <Labels labels={row.labels} key={row.name} />
              </div>
            </div>
          ),
        }}
      />
    </Card>
  );
};
export default NodesTable;
