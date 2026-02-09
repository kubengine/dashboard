import { KubernetesNodeData } from '@/components/data';
import Labels from '@/components/Labels';
import { formatBytes } from '@/utils/storage';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Empty,
  Progress,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React from 'react';

const { Title } = Typography;

interface NodesTableProps {
  dataSource?: KubernetesNodeData[];
  loading?: boolean;
  title?: string;
}

const NodesTable: React.FC<NodesTableProps> = ({
  dataSource = [],
  loading = false,
  title = 'Nodes',
}) => {
  // 列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string) => (
        <Button
          type="link"
          onClick={() => {
            history.push(`/nodeDetail?name=${text}`);
          }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '标签',
      dataIndex: 'labels',
      key: 'labels',
      width: 200,
      render: (labels: Record<string, string>, record: KubernetesNodeData) => (
        <Labels labels={labels} key={record.key} />
      ),
    },
    {
      title: '准备状态',
      dataIndex: 'ready',
      key: 'ready',
      width: 50,
      render: (ready: boolean) => (
        <Tag
          icon={ready ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          color={ready ? 'success' : 'warning'}
        >
          {ready ? 'True' : 'False'}
        </Tag>
      ),
    },
    {
      title: 'CPU 请求（核数）',
      dataIndex: 'cpuRequest',
      key: 'cpuRequest',
      width: 120,
      render: (text: string, record: KubernetesNodeData) => {
        const percent = record.cpuRequestsFraction;
        var cpuRequests = record.cpuRequests;
        if (cpuRequests > 1000) {
          cpuRequests = cpuRequests / 1000;
        }
        return (
          <>
            {Number(cpuRequests) > 1000 ? (
              <div>{cpuRequests}m</div>
            ) : (
              <div>{cpuRequests}</div>
            )}
            <Progress
              percent={percent}
              size="small"
              strokeColor={{
                '0%': '#52c41a',
                '100%': '#f5222d',
              }}
              showInfo={false}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>({percent}%)</div>
          </>
        );
      },
    },
    {
      title: 'CPU 限制（核数）',
      dataIndex: 'cpuLimit',
      key: 'cpuLimit',
      width: 120,
      render: (text: string, record: KubernetesNodeData) => {
        const percent = record.cpuLimitsFraction;
        const cpuLimits = record.cpuLimits / 1000;
        return (
          <div>
            <div>{cpuLimits}</div>
            <Progress
              percent={percent}
              size="small"
              strokeColor={{
                '0%': '#52c41a',
                '100%': '#f5222d',
              }}
              showInfo={false}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>({percent}%)</div>
          </div>
        );
      },
    },
    {
      title: 'CPU 容量（核数）',
      dataIndex: 'cpuCapacity',
      key: 'cpuCapacity',
      width: 70,
      render: (cpuCapacity: number) => {
        return cpuCapacity / 1000;
      },
    },
    {
      title: '内存请求（字节数）',
      dataIndex: 'memoryRequest',
      key: 'memoryRequest',
      width: 120,
      render: (text: string, record: KubernetesNodeData) => {
        const memoryRequests = record.memoryRequests;
        const s = formatBytes(memoryRequests);
        const percent = record.memoryRequestsFraction;
        return (
          <div>
            <div>
              {s.value} {s.unit}
            </div>
            <Progress
              percent={percent}
              size="small"
              strokeColor={{
                '0%': '#52c41a',
                '100%': '#f5222d',
              }}
              showInfo={false}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>({percent}%)</div>
          </div>
        );
      },
    },
    {
      title: '内存限制（字节数）',
      dataIndex: 'memoryLimit',
      key: 'memoryLimit',
      width: 120,
      render: (text: string, record: KubernetesNodeData) => {
        const percent = record.memoryLimitsFraction;
        const memoryLimits = record.memoryLimits;
        const s = formatBytes(memoryLimits);
        return (
          <div>
            <div>
              {s.value} {s.unit}
            </div>
            <Progress
              percent={percent}
              size="small"
              strokeColor={{
                '0%': '#52c41a',
                '100%': '#f5222d',
              }}
              showInfo={false}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>({percent}%)</div>
          </div>
        );
      },
    },
    {
      title: '内存容量（字节数）',
      dataIndex: 'memoryCapacity',
      key: 'memoryCapacity',
      width: 80,
      render: (memoryCapacity: number) => {
        const s = formatBytes(memoryCapacity);
        return `${s.value} ${s.unit}`;
      },
    },
    {
      title: 'Pods',
      dataIndex: 'pods',
      key: 'pods',
      width: 120,
      render: (text: string, record: KubernetesNodeData) => {
        const percent = record.podFraction;
        const allocatedPods = record.allocatedPods;
        return (
          <div>
            <div>{allocatedPods}</div>
            <Progress
              percent={percent}
              size="small"
              strokeColor={{
                '0%': '#52c41a',
                '100%': '#f5222d',
              }}
              showInfo={false}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>({percent}%)</div>
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'creationTimestamp',
      key: 'creationTimestamp',
      width: 120,
      render: (creationTimestamp: string) => {
        return dayjs(creationTimestamp).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];

  return (
    <Card>
      <Title level={2} style={{ marginBottom: '24px' }}>
        {title}
      </Title>
      <Spin spinning={loading}>
        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          scroll={{ x: 1500 }}
          size="middle"
          locale={{
            emptyText: <Empty description="暂无节点数据" />,
          }}
        />
      </Spin>
    </Card>
  );
};

export default NodesTable;
