import services from '@/services';
import { isSuccessCode, showRequestError } from '@/utils/request';
import { ProDescriptions } from '@ant-design/pro-components';
import { Card, Divider, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
import { PodsStatus } from './PodsStatus';
import ResourcePods from './ResourcePods';
import Services from './Services';
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
    try {
      const { code, data } =
        await services.KubernetesController.resource_detail(
          'daemonset',
          namespace,
          name,
        );
      if (isSuccessCode(code)) {
        setResource(data);
      }
    } catch (error) {
      showRequestError(error);
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
                  <Tag key={item} bordered={false} style={{ margin: 0 }}>
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
