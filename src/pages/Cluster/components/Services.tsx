import Labels from '@/components/Labels';
import services from '@/services';
import { Link } from '@umijs/max';
import { Card, PaginationProps, Space, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface ServicesProps {
  name: string;
  namespace: string;
  type?: string;
}
const Services: React.FC<ServicesProps> = ({ name, namespace, type }) => {
  const [data, setData] = useState<Service[]>([]);
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
          encodeURIComponent(encodeURIComponent(`${name}/service`)),
        );
      if (code == 200) {
        const { services, listMeta } = data;
        setCount(listMeta.totalItems);
        setData(services);
      }
    } else {
      const { code, data } = await services.KubernetesController.resource(
        'service',
        namespace,
        name,
        paginationParams.pageSize,
        paginationParams.current,
      );
      if (code == 200) {
        const { services, listMeta } = data;
        setCount(listMeta.totalItems);
        setData(services);
      }
    }
  };
  useEffect(() => {
    if (name && namespace) {
      get_resource();
    }
  }, [name, namespace]);

  const serviceColumns = [
    {
      title: '名称',
      dataIndex: ['objectMeta', 'name'],
      key: 'objectMeta.name',
      width: 150,
      render: (name: string, record: any) => (
        <Link to={`/apps/info/service/${record.objectMeta.namespace}/${name}`}>
          {name}
        </Link>
      ),
    },
    {
      title: '标签',
      dataIndex: ['objectMeta', 'labels'],
      key: 'labels',
      width: 150,
      render: (labels: Record<string, string>, record: Service) => (
        <Labels labels={labels} key={record.objectMeta.name} />
      ),
    },
    {
      title: '类别',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '集群 IP',
      dataIndex: 'clusterIP',
      key: 'clusterIP',
      width: 100,
    },
    {
      title: '内部 Endpoints',
      dataIndex: 'internalEndpoint',
      key: 'internalEndpoint',
      width: 150,
      render: (internalEndpoint: Endpoint) => {
        return (
          <Space direction="vertical" size="middle">
            {internalEndpoint.ports.map((item, index) => (
              <Tooltip title={item.protocol}>
                <Tag
                  key={`internalEndpoint-${index}`}
                  bordered={false}
                  color={item.protocol == 'TCP' ? 'cyan' : 'gold'}
                  style={{ margin: 0 }}
                >
                  {internalEndpoint.host}:{item.port}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: '外部 Endpoints',
      dataIndex: 'externalEndpoints',
      key: 'externalEndpoints',
      render: (externalEndpoints: ExternalEndpoint[]) => {
        return (
          <Space direction="vertical" size="middle">
            {externalEndpoints.map((externalEndpoint, outIndex) =>
              externalEndpoint.ports.map((item, index) => (
                <Tooltip
                  key={`tooltip-${outIndex}-${index}`}
                  title={item.protocol}
                >
                  <Tag
                    key={`externalEndpoint-${outIndex}-${index}`}
                    bordered={false}
                    color={item.protocol == 'TCP' ? 'cyan' : 'gold'}
                    style={{ margin: 0 }}
                  >
                    {externalEndpoint.host}:{item.port}
                  </Tag>
                </Tooltip>
              )),
            )}
          </Space>
        );
      },
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
    <Card title="Services" style={{ marginBottom: '24px' }}>
      <Table<Service>
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

export default Services;
