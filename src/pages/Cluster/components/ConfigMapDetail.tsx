import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Card, Divider } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
interface ConfigMapProps {
  namespace: string;
  name: string;
}
const ConfigMapDetail: React.FC<ConfigMapProps> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'configmap',
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
      <Card title="Data">
        <ProDescriptions dataSource={resource} column={1}>
          {Object.keys(resource?.data || {}).map((key) => {
            return (
              <ProDescriptions.Item
                label={key}
                valueType="code"
                dataIndex={['data', key]}
              />
            );
          })}
        </ProDescriptions>
      </Card>
    </>
  );
};

export default ConfigMapDetail;
