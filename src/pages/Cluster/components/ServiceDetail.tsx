import Labels from '@/components/Labels';
import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Card, Divider, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import Ingresses from './Ingresses';
import { Metadata } from './Metadata';
import ResourcePods from './ResourcePods';
interface ServiceDetailProps {
  namespace: string;
  name: string;
}
const ServiceDetail: React.FC<ServiceDetailProps> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'service',
      namespace,
      name,
    );
    if (code == 200) {
      setResource(data);
    }
  };

  useEffect(() => {
    if (name && namespace) {
      get_resource();
    }
  }, [namespace, name]);
  const columns = [
    {
      title: '主机',
      dataIndex: 'host',
      key: 'host',
      width: 150,
    },
    {
      title: '端口 (名称, 端口, 协议)',
      key: 'mpt',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small" wrap>
          {record.ports.map((item: any) =>
            Object.entries(item || {}).map(([key, value]) => (
              <Tag bordered={false} style={{ margin: 0 }}>
                {`${key}: ${value}`}
              </Tag>
            )),
          )}
        </Space>
      ),
    },
    {
      title: '节点',
      dataIndex: 'nodeName',
      key: 'nodeName',
      width: 150,
    },
    {
      title: '准备就绪',
      dataIndex: 'ready',
      key: 'ready',
      width: 150,
      render: (ready: boolean) => (
        <Tag
          bordered={false}
          color={ready ? 'green' : 'red'}
          style={{ margin: 0 }}
        >
          {ready ? 'True' : 'False'}
        </Tag>
      ),
    },
  ];
  return (
    <>
      <Metadata data={resource?.objectMeta} />
      <Divider />
      <Card title="资源信息">
        <ProDescriptions layout="vertical" dataSource={resource}>
          <ProDescriptions.Item dataIndex="type" label="Type" />
          <ProDescriptions.Item dataIndex="clusterIP" label="Cluster IP" />
          <ProDescriptions.Item
            dataIndex="sessionAffinity"
            label="会话亲和性"
          />
          <ProDescriptions.Item
            dataIndex="selector"
            label="Selector"
            render={(_, record) => (
              <Labels
                labels={record.selector || {}}
                key={`se-${record.name}`}
              />
            )}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <Card title="Endpoints">
        <Table
          columns={columns}
          dataSource={resource?.endpointList.endpoints || []}
          pagination={false}
        />
      </Card>
      <Divider />
      <ResourcePods type="service" namespace={namespace} name={name} />
      <Divider />
      <Ingresses type="service" namespace={namespace} name={name} />
    </>
  );
};

export default ServiceDetail;
