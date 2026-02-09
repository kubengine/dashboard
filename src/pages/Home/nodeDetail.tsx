import Usage from '@/components/Usage';
import { DataPoint2, KubernetesNodeDetail } from '@/components/data';
import service from '@/services';
import { getRelativeTime } from '@/utils/time';
import { PageContainer } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import {
  Card,
  Col,
  Descriptions,
  DescriptionsProps,
  message,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
const { node } = service.KubernetesController;

const { Title } = Typography;

// 表格列配置
const columns = [
  {
    title: '类别',
    dataIndex: 'type',
    key: 'type',
    width: 150,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => (
      <Tag color={status === 'True' ? 'green' : 'red'}>{status}</Tag>
    ),
  },
  {
    title: '最后的检测时间',
    dataIndex: 'lastProbeTime',
    key: 'lastProbeTime',
    width: 150,
    render: (lastProbeTime: string) => {
      return dayjs(lastProbeTime).format('YYYY-MM-DD HH:mm:ss');
    },
  },
  {
    title: '最后的迁移时间',
    dataIndex: 'lastTransitionTime',
    key: 'lastTransitionTime',
    width: 150,
    render: (lastTransitionTime: string) => {
      return getRelativeTime(lastTransitionTime);
    },
  },
  {
    title: '原因',
    dataIndex: 'reason',
    key: 'reason',
    width: 180,
  },
  {
    title: '信息',
    dataIndex: 'message',
    key: 'message',
    width: 250,
  },
];

const NodeDetailPage: React.FC = () => {
  const [nodeData, setNodeData] = useState<KubernetesNodeDetail>();
  const [loading, setLoading] = useState<boolean>(false);
  const [cpuUsageRate, setCpuUsageRate] = useState<DataPoint2[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<DataPoint2[]>([]);
  const [metadataDescriptions, SetMetadataDescriptions] = useState<
    DescriptionsProps['items']
  >([]);
  const [resourceDescriptions, SetResourceDescriptions] = useState<
    DescriptionsProps['items']
  >([]);
  const [systemDescriptions, SetSystemDescriptions] = useState<
    DescriptionsProps['items']
  >([]);
  const [allocatedDescriptions, SetAllocatedDescriptions] = useState<
    DescriptionsProps['items']
  >([]);

  // 获取路由参数
  const [searchParams, setSearchParams] = useSearchParams();
  const name = searchParams.get('name');
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (name == undefined) {
        message.error('获取name失败,请重试');
        return;
      }
      const { data } = await node(name);
      setNodeData(data);

      const metrics = data['metrics'];
      const cpu_usage_rate = metrics.find(
        (item: any) => item['metricName'] == 'cpu/usage_rate',
      );
      var cpuUsageRate: DataPoint2[] = [];
      cpu_usage_rate['dataPoints'].forEach((item: any) => {
        cpuUsageRate.push({
          x: dayjs(item.x * 1000).format('HH:mm'),
          y: item.y / 1000,
          type: 'CPU Usage',
        });
      });
      setCpuUsageRate(cpuUsageRate);
      const memory_usage = metrics.find(
        (item: any) => item['metricName'] == 'memory/usage',
      );
      var memoryUsageRate: DataPoint2[] = [];
      memory_usage['dataPoints'].forEach((item: any) => {
        memoryUsageRate.push({
          x: dayjs(item.x * 1000).format('HH:mm'),
          y: Number((item.y / 1024 / 1024 / 1024).toFixed(2)),
          type: 'Memory Usage',
        });
      });
      setMemoryUsage(memoryUsageRate);
      const objectMeta = data['objectMeta'];
      SetMetadataDescriptions([
        { key: '1', label: 'Name', children: objectMeta['name'] },
        {
          key: '2',
          label: 'Created',
          children: dayjs(objectMeta['creationTimestamp']).format(
            'YYYY-MM-DD HH:mm:ss',
          ),
        },
        {
          key: '6',
          label: 'Age',
          children: getRelativeTime(objectMeta['creationTimestamp']),
        },
        { key: '3', label: 'UID', children: objectMeta['uid'] },
        {
          key: '4',
          label: 'Labels',
          children: (
            <Space wrap>
              {Object.entries(objectMeta.labels).map(([key, value]) => (
                <Tag key={key} color="blue">
                  {key}: {String(value)}
                </Tag>
              ))}
            </Space>
          ),
          span: 4,
        },
        {
          key: '5',
          label: '注解',
          children: (
            <>
              {Object.entries(objectMeta.annotations).map(([key, value]) => (
                <Tag key={key} color="blue">
                  {key}: {String(value)}
                </Tag>
              ))}
            </>
          ),
          span: 4,
        },
      ]);

      SetResourceDescriptions([
        {
          key: '11',
          label: '地址',
          children: (
            <>
              <Tag key={'address0'} color="blue">
                {' '}
                {data['addresses'][0]['type']}:{' '}
                {data['addresses'][0]['address']}{' '}
              </Tag>
              <Tag key={'address1'} color="blue">
                {' '}
                {data['addresses'][1]['type']}:{' '}
                {data['addresses'][1]['address']}{' '}
              </Tag>
            </>
          ),
          span: 4,
        },
      ]);
      const nodeInfo = data['nodeInfo'];
      SetSystemDescriptions([
        { key: '1', label: '机器 ID', children: nodeInfo['machineID'] },
        { key: '2', label: '系统 UUID', children: nodeInfo['systemUUID'] },
        { key: '3', label: 'Boot ID', children: nodeInfo['bootID'] },
        {
          key: '4',
          label: '内核版本',
          children: nodeInfo['kernelVersion'],
        },
        { key: '5', label: 'OS Image', children: nodeInfo['osImage'] },
        {
          key: '6',
          label: '容器运行时版本',
          children: nodeInfo['containerRuntimeVersion'],
        },
        {
          key: '7',
          label: 'kubelet 版本',
          children: nodeInfo['kubeletVersion'],
        },
        {
          key: '8',
          label: '操作系统',
          children: nodeInfo['operatingSystem'],
        },
        { key: '9', label: '架构', children: nodeInfo['architecture'] },
        {
          key: '10',
          label: 'CPU 容量',
          children: data['allocatedResources']['cpuCapacity'] / 1000,
        },
        {
          key: '11',
          label: '内存容量',
          children: `${(
            data['allocatedResources']['memoryCapacity'] /
            1024 /
            1024 /
            1024
          ).toFixed(3)}Gi`,
        },
        {
          key: '12',
          label: 'Pods 容量',
          children: data['allocatedResources']['allocatedPods'],
        },
      ]);
      const allocatedDescriptions = data['allocatedResources'];
      SetAllocatedDescriptions([
        {
          key: '1',
          label: `CPU Requests(Cores: ${(
            allocatedDescriptions['cpuRequests'] / 1000
          ).toFixed(2)})`,
          children: (
            <Progress
              percent={Number(
                allocatedDescriptions['cpuRequestsFraction'].toFixed(2),
              )}
              size="small"
              strokeColor={{
                '0%': '#87d068',
                '50%': '#ffe58f',
                '100%': '#ffccc7',
              }}
              type="circle"
            />
          ),
        },
        {
          key: '2',
          label: `CPU Limits(Cores: ${(
            allocatedDescriptions['cpuLimits'] / 1000
          ).toFixed(2)})`,
          children: (
            <Progress
              percent={Number(
                allocatedDescriptions['cpuLimitsFraction'].toFixed(2),
              )}
              size="small"
              strokeColor={{
                '0%': '#87d068',
                '50%': '#ffe58f',
                '100%': '#ffccc7',
              }}
              type="circle"
            />
          ),
        },
        {
          key: '3',
          label: `Memory Requests(GiB: ${(
            allocatedDescriptions['memoryRequests'] /
            1024 /
            1024 /
            1024
          ).toFixed(2)})`,
          children: (
            <Progress
              percent={Number(
                allocatedDescriptions['memoryRequestsFraction'].toFixed(2),
              )}
              size="small"
              strokeColor={{
                '0%': '#87d068',
                '50%': '#ffe58f',
                '100%': '#ffccc7',
              }}
              type="circle"
            />
          ),
        },
        {
          key: '4',
          label: `Memory Limits(GiB: ${(
            allocatedDescriptions['memoryLimits'] /
            1024 /
            1024 /
            1024
          ).toFixed(2)})`,
          children: (
            <Progress
              percent={Number(
                allocatedDescriptions['memoryLimitsFraction'].toFixed(2),
              )}
              size="small"
              strokeColor={{
                '0%': '#87d068',
                '50%': '#ffe58f',
                '100%': '#ffccc7',
              }}
              type="circle"
            />
          ),
        },
        {
          key: '5',
          label: `Pods: (${allocatedDescriptions['allocatedPods']})`,
          children: (
            <Progress
              percent={Number(allocatedDescriptions['podFraction'].toFixed(2))}
              size="small"
              strokeColor={{
                '0%': '#87d068',
                '50%': '#ffe58f',
                '100%': '#ffccc7',
              }}
              type="circle"
            />
          ),
        },
      ]);

      setLoading(false);
    };
    fetchData();
  }, [name]);
  return (
    <PageContainer>
      <div
        style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}
      >
        <Card>
          <Title level={2} style={{ marginBottom: '24px' }}>
            节点详情: {nodeData?.objectMeta.name}
          </Title>
          <Row gutter={24} style={{ marginBottom: '24px' }}>
            <Col span={12}>
              <Usage
                loading={loading}
                dataSource={cpuUsageRate}
                title="CPU Usage"
                yTitle="CPU (cores)"
                unit="CPU"
              />
            </Col>
            <Col span={12}>
              <Usage
                loading={loading}
                dataSource={memoryUsage}
                title="Memory Usage"
                yTitle="Memory (bytes)"
                styleFill="l(270) 0:#ffffff 0.2:#7ec2f3 1:#1890ff"
                unit="Gi"
              />
            </Col>
          </Row>
          <Card style={{ marginBottom: '24px' }}>
            <Descriptions
              column={4}
              title="Metadata"
              layout="vertical"
              bordered={true}
              items={metadataDescriptions}
            />
          </Card>
          <Card style={{ marginBottom: '24px' }}>
            <Descriptions
              column={4}
              title="资源信息"
              layout="vertical"
              bordered={true}
              items={resourceDescriptions}
            />
          </Card>
          <Card style={{ marginBottom: '24px' }}>
            <Descriptions
              column={4}
              title="系统信息"
              layout="vertical"
              bordered={true}
              items={systemDescriptions}
            />
          </Card>
          <Card style={{ marginBottom: '24px' }}>
            <Descriptions
              column={5}
              title="分配"
              // layout="vertical"
              bordered={true}
              items={allocatedDescriptions}
            />
          </Card>
          <Card style={{ marginBottom: '24px' }} title="状况">
            <Table
              columns={columns}
              dataSource={nodeData?.conditions}
              pagination={false}
              size="middle"
              scroll={{ x: 800 }}
            />
          </Card>
        </Card>
      </div>
    </PageContainer>
  );
};

export default NodeDetailPage;
