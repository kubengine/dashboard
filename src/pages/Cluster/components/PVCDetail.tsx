import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card, Divider, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
interface PVCDetailProps {
  namespace: string;
  name: string;
}
const PVCDetail: React.FC<PVCDetailProps> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'persistentvolumeclaim',
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

  return (
    <>
      <Metadata data={resource?.objectMeta} />
      <Divider />
      <Card title="资源信息">
        <ProDescriptions layout="vertical" dataSource={resource}>
          <ProDescriptions.Item dataIndex="status" label="Status" />
          <ProDescriptions.Item
            dataIndex="storageClass"
            label="Storage Class"
          />
          <ProDescriptions.Item
            dataIndex="volume"
            label="卷名称"
            render={(data: any) => (
              <Link
                to={`/apps/info/pv/${resource?.objectMeta.namespace}/${data}`}
              >
                {data}
              </Link>
            )}
          />
          <ProDescriptions.Item
            dataIndex="capacity"
            label="Capacity"
            render={(data: any) => <Tag>storage:{data?.storage}</Tag>}
            // renderText={(data) => {
            //   return data.storage;
            // }}
          />
          <ProDescriptions.Item
            dataIndex="accessModes"
            label="Access Modes"
            render={() => {
              return (
                <Space direction="vertical" size="small">
                  {(resource?.accessModes || []).map((item: any) => (
                    <Tag>{item}</Tag>
                  ))}
                </Space>
              );
            }}
          />
        </ProDescriptions>
      </Card>
    </>
  );
};

export default PVCDetail;
