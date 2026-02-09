import Labels from '@/components/Labels';
import services from '@/services';
import { Area } from '@ant-design/plots';
import { Link } from '@umijs/max';
import { Card, PaginationProps, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface ResourcePodsProps {
  type: string;
  namespace: string;
  name: string;
}
const ResourcePods: React.FC<ResourcePodsProps> = ({
  type,
  namespace,
  name,
}) => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [count, setCount] = useState<number>(0);
  const [paginationParams, setPaginationParams] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });
  const columns = [
    {
      title: '名称',
      dataIndex: ['objectMeta', 'name'],
      key: 'objectMeta.name',
      width: 150,
      render: (name: string) => (
        <Link to={`/apps/info/pod/${namespace}/${name}`}>{name}</Link>
      ),
    },
    {
      title: '镜像',
      dataIndex: 'containerImages',
      key: 'containerImages',
      width: 150,
      render: (containerImages: string[]) => {
        return (
          <>
            {containerImages.map((item, index) => (
              <Tag key={index} color="blue" style={{ margin: 0 }}>
                {item}
              </Tag>
            ))}
          </>
        );
      },
    },
    {
      title: '标签',
      dataIndex: ['objectMeta', 'labels'],
      key: 'labels',
      width: 150,
      render: (labels: Record<string, string>, record: Pod) => (
        <Labels labels={labels} key={record.objectMeta.name} />
      ),
    },
    {
      title: '节点',
      dataIndex: 'nodeName',
      key: 'nodeName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'CPU使用率（核数）',
      dataIndex: ['metrics', 'cpuUsageHistory'],
      key: 'cpuUsageHistory',
      width: 200,
      render: (cpuUsageHistory: any, record: Pod) => {
        const cpuUsage =
          cpuUsageHistory?.map((item: any) => {
            return {
              value: item['value'],
              timestamp: dayjs(item['timestamp']).format('YYYY-MM-DD HH:mm:ss'),
            };
          }) || [];
        return (
          <Area
            {...{
              data: cpuUsage, // 使用预处理后的数据
              xField: 'timestamp',
              yField: 'value',
              axis: false,
              style: {
                fill: 'linear-gradient(-90deg, white 0%, darkgreen 100%)',
              },
              title: `${record.metrics?.cpuUsage || ''}m`,
            }}
            height={100}
          />
        );
      },
    },
    {
      title: '内存使用（字节数）',
      dataIndex: ['metrics', 'memoryUsageHistory'],
      key: 'memoryUsageHistory',
      width: 200,
      render: (memoryUsageHistory: any, record: Pod) => {
        const memoryUsage =
          memoryUsageHistory?.map((item: any) => {
            return {
              value: Number((item['value'] / 1024 / 1024).toFixed(2)),
              timestamp: dayjs(item['timestamp']).format('YYYY-MM-DD HH:mm:ss'),
            };
          }) || [];
        return (
          <Area
            {...{
              data: memoryUsage, // 使用预处理后的数据
              xField: 'timestamp',
              yField: 'value',
              axis: false,
              style: {
                fill: 'l(270) 0:#ffffff 0.2:#7ec2f3 1:#1890ff',
              },
              title: `${(
                (record.metrics?.memoryUsage || 0) /
                1024 /
                1024
              ).toFixed(2)}Mi`,
            }}
            height={100}
          />
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'creationTimestamp',
      key: 'creationTimestamp',
      width: 200,
      render: (creationTimestamp: string) => {
        return dayjs(creationTimestamp).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];
  const get_stateful_set_pod = async () => {
    const { code, data } = await services.KubernetesController.resource_pod(
      type,
      namespace,
      name,
      paginationParams.pageSize,
      paginationParams.current,
    );
    if (code == 200) {
      const { listMeta, pods } = data;
      setCount(listMeta.totalItems);
      setPods(pods);
    }
  };
  const handleTableChange: PaginationProps['onChange'] = (
    current: number,
    pageSize: number,
  ) => {
    setPaginationParams({ current, pageSize });
  };
  useEffect(() => {
    if (type && name && namespace) {
      get_stateful_set_pod();
    }
  }, [type, name, namespace, paginationParams]);
  return (
    <Card title="Pods">
      <Table<Pod>
        columns={columns}
        dataSource={pods}
        pagination={{
          ...paginationParams,
          showSizeChanger: true,
          total: count,
          onChange: handleTableChange,
        }}
      />
    </Card>
  );
};

export default ResourcePods;
