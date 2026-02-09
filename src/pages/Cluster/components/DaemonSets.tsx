import Labels from '@/components/Labels';
import services from '@/services';
import { getRelativeTime } from '@/utils/time';
import { Link } from '@umijs/max';
import { Card, PaginationProps, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';

interface DaemonSetsProps {
  name: string;
  namespace: string;
}

const DaemonSets: React.FC<DaemonSetsProps> = ({ name, namespace }) => {
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<any[]>([]);
  const [paginationParams, setPaginationParams] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });
  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource(
      'daemonset',
      namespace,
      name,
      paginationParams.pageSize,
      paginationParams.current,
    );
    if (code == 200) {
      const { daemonSets, listMeta } = data;
      setCount(listMeta.totalItems);
      setData(daemonSets);
    }
  };

  useEffect(() => {
    if (name) {
      get_resource();
    }
  }, [name, paginationParams]);
  const columns = [
    {
      title: '名称',
      dataIndex: ['objectMeta', 'name'],
      key: 'objectMeta.name',
      width: 150,
      render: (name: string, record: any) => (
        <Link
          to={`/apps/info/daemonset/${record.objectMeta.namespace}/${name}`}
        >
          {name}
        </Link>
      ),
    },
    {
      title: '镜像',
      dataIndex: 'containerImages',
      key: 'containerImages',
      width: 150,
      render: (containerImages: string[]) => {
        return (
          <Space direction="vertical" size="small">
            {containerImages.map((item) => (
              <Tag bordered={false} color="cyan" style={{ margin: 0 }}>
                {item}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '标签',
      dataIndex: ['objectMeta', 'labels'],
      key: 'objectMeta.labels',
      width: 250,
      render: (labels: Record<string, string>, record: any) => (
        <Labels labels={labels} key={record.objectMeta.name} />
      ),
    },
    {
      title: 'pod',
      dataIndex: 'podInfo',
      key: 'podInfo',
      width: 150,
      render: (podInfo: Record<string, string>) =>
        `${podInfo.running}/${podInfo.desired}`,
    },
    {
      title: '创建于',
      dataIndex: ['objectMeta', 'creationTimestamp'],
      key: 'objectMeta.creationTimestamp',
      width: 150,
      render: (creationTimestamp: string) => getRelativeTime(creationTimestamp),
    },
  ];
  const handleTableChange: PaginationProps['onChange'] = (
    current: number,
    pageSize: number,
  ) => {
    setPaginationParams({ current, pageSize });
  };
  return (
    <Card title="Daemon Sets">
      <Table
        columns={columns}
        dataSource={data}
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

export default DaemonSets;
