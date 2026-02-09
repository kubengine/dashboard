import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Card, Divider, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
import ResourcePods from './ResourcePods';
import Services from './Services';
import { PodsStatus } from './PodsStatus';
interface DaemonSetDetailProps {
  namespace: string;
  name: string;
}
const DaemonSetDetail: React.FC<DaemonSetDetailProps> = ({
  namespace,
  name,
}) => {
  const [resource, setResource] = useState<StatefulSetResource>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'daemonset',
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
      <PodsStatus data={resource?.podInfo || {}} />
      <Divider />
      <Card title="资源信息">
        <ProDescriptions layout="vertical" column={1}>
          <ProDescriptions.Item
            dataIndex="containerImages"
            label="Images"
            render={() => (
              <Space size="small" wrap>
                {(resource?.containerImages || []).map((item) => (
                  <Tag bordered={false} style={{ margin: 0 }}>
                    {item}
                  </Tag>
                ))}
              </Space>
            )}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <ResourcePods type="daemonset" namespace={namespace} name={name} />
      <Divider />
      <Services name={name} namespace={namespace} />
    </>
  );
};

export default DaemonSetDetail;
