import Labels from '@/components/Labels';
import services from '@/services';
import { Link } from '@umijs/max';
import { Card, PaginationProps, Table } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface ConfigMapsProps {
  name: string;
  namespace: string;
}
const ConfigMaps: React.FC<ConfigMapsProps> = ({ name, namespace }) => {
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
    const { code, data } = await services.KubernetesController.resource(
      'configmap',
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
        <Link
          to={`/apps/info/configmap/${record.objectMeta.namespace}/${name}`}
        >
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
    <Card title="ConfigMaps" style={{ marginBottom: '24px' }}>
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

export default ConfigMaps;
