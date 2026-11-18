import { getRelativeTime } from '@/utils/time';
import { Table, Tooltip, Typography } from 'antd';
import React from 'react';
import { ResourceLink, ResourceRow, Status } from './catalog';

export const eventColumns = [
  {
    title: '级别',
    dataIndex: 'type',
    width: 110,
    render: (value: string) => <Status value={value} />,
  },
  { title: '原因', dataIndex: 'reason', width: 180 },
  {
    title: '关联资源',
    width: 220,
    render: (_: unknown, row: ResourceRow) => (
      <>
        <div className="ke-resource-secondary">{row.involvedObject?.kind}</div>
        <ResourceLink
          kind={row.involvedObject?.kind}
          namespace={row.involvedObject?.namespace || row.objectMeta.namespace}
          name={row.involvedObject?.name}
        />
      </>
    ),
  },
  {
    title: '消息',
    dataIndex: 'message',
    width: 420,
    render: (value: string) => (
      <Typography.Paragraph
        ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
        style={{ marginBottom: 0 }}
      >
        {value}
      </Typography.Paragraph>
    ),
  },
  { title: '次数', dataIndex: 'count', width: 80 },
  {
    title: '最近发生',
    dataIndex: 'lastTimestamp',
    width: 150,
    render: (value: string) => (
      <Tooltip title={value}>{getRelativeTime(value) || '—'}</Tooltip>
    ),
  },
];
const Events: React.FC<{
  rows: ResourceRow[];
  loading?: boolean;
  total?: number;
  page?: number;
  onPage?: (page: number) => void;
}> = ({ rows, loading, total = rows.length, page = 1, onPage }) => (
  <Table
    columns={eventColumns}
    dataSource={rows}
    rowKey={(row) => row.objectMeta.uid || row.objectMeta.name}
    size="middle"
    loading={loading}
    scroll={{ x: 1160 }}
    locale={{
      emptyText: '暂无事件；Kubernetes 事件会按集群保留策略自动过期。',
    }}
    pagination={{
      current: page,
      pageSize: 10,
      total,
      onChange: onPage,
      showSizeChanger: false,
    }}
  />
);
export default Events;
