import Labels from '@/components/Labels';
import services from '@/services';
import { Link } from '@umijs/max';
import { Card, PaginationProps, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface PVCsProps {
  name: string;
  namespace: string;
  type?: string;
}
const PVCs: React.FC<PVCsProps> = ({ name, namespace, type }) => {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [paginationParams, setPaginationParams] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });
  const get_resource = async () => {
    if (type) {
      const { code, data } =
        await services.KubernetesController.resource_detail(
          type,
          namespace,
          encodeURIComponent(encodeURIComponent(`${name}/persistentvolumeclaim`)),
        );
      if (code == 200) {
        const { items, listMeta } = data;
        setCount(listMeta.totalItems);
        setData(items);
      }
    } else {
      const { code, data } = await services.KubernetesController.resource(
        'persistentvolumeclaim',
        namespace,
        name,
        paginationParams.pageSize,
        paginationParams.current,
      );
      if (code == 200) {
        const { items, listMeta } = data;
        setCount(listMeta.totalItems);
        setData(items);
      }
    }
  };
  useEffect(() => {
    if (name) {
      get_resource();
    }
  }, [name]);

  const serviceColumns = [
    {
      title: '名称',
      dataIndex: ['objectMeta', 'name'],
      key: 'objectMeta.name',
      width: 150,
      render: (name: string, record: any) => (
        <Link to={`/apps/info/pvc/${record.objectMeta.namespace}/${name}`}>
          {name}
        </Link>
      ),
    },
    {
      title: '标签',
      dataIndex: ['objectMeta', 'labels'],
      key: 'labels',
      render: (labels: Record<string, string>, record: Service) => (
        <Labels labels={labels} key={record.objectMeta.name} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
    },
    {
      title: '容量',
      dataIndex: ['capacity', 'storage'],
      key: 'capacity.storage',
    },
    {
      title: '访问模式',
      dataIndex: 'accessModes',
      key: 'accessModes',
      render: (accessModes: string[]) => {
        return (
          <Space direction="vertical" size="small">
            {accessModes.map((item) => (
              <Tag bordered={false} color="cyan" style={{ margin: 0 }}>
                {item}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '存储类',
      dataIndex: 'storageClass',
      key: 'storageClass',
    },
    {
      title: '创建时间',
      dataIndex: ['objectMeta', 'creationTimestamp'],
      key: 'creationTimestamp',
      render: (creationTimestamp: string) => {
        return dayjs(creationTimestamp).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];
  const handleTableChange: PaginationProps['onChange'] = (
    current: number,
    pageSize: number,
  ) => {
    setPaginationParams({ current, pageSize });
  };
  return (
    <Card title="Persistent Volume Claims" style={{ marginBottom: '24px' }}>
      <Table
        columns={serviceColumns}
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

export default PVCs;
