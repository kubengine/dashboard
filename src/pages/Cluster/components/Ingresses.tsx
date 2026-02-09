import Labels from '@/components/Labels';
import services from '@/services';
import { Link } from '@umijs/max';
import { Card, PaginationProps, Space, Table } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface Props {
  name: string;
  namespace: string;
  type?: string;
}
const Ingresses: React.FC<Props> = ({ name, namespace, type }) => {
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
          encodeURIComponent(encodeURIComponent(`${name}/ingress`)),
        );
      if (code == 200) {
        const { items, listMeta } = data;
        setCount(listMeta.totalItems);
        setData(items);
      }
    } else {
      const { code, data } = await services.KubernetesController.resource(
        'ingress',
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
      width: 250,
      render: (name: string, record: any) => (
        <Link to={`/apps/info/ingress/${record.objectMeta.namespace}/${name}`}>
          {name}
        </Link>
      ),
    },
    {
      title: '标签',
      dataIndex: ['objectMeta', 'labels'],
      key: 'labels',
      width: 250,
      render: (labels: Record<string, string>, record: Service) => (
        <Labels labels={labels} key={record.objectMeta.name} />
      ),
    },
    {
      title: '端点',
      dataIndex: 'endpoints',
      key: 'endpoints',
      width: 250,
      render: (endpoints: any[]) => {
        return (
          <Space direction="vertical" size="small">
            {endpoints.map((item) => (
              <a
                href={
                  item.ports
                    ? `http://${item.host}:${item.ports}`
                    : `http://${item.host}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.host}
              </a>
            ))}
          </Space>
        );
      },
    },
    {
      title: '主机',
      dataIndex: 'hosts',
      key: 'hosts',
      width: 250,
      render: (hosts: string[]) => {
        return (
          <Space direction="vertical" size="small">
            {hosts.map((item) => (
              <a
                href={`https://${item}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item}
              </a>
            ))}
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: ['objectMeta', 'creationTimestamp'],
      key: 'creationTimestamp',
      width: 250,
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
    <Card title="Ingresses" style={{ marginBottom: '24px' }}>
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

export default Ingresses;
