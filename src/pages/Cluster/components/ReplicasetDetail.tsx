import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card, Divider, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
import ResourcePods from './ResourcePods';
import Services from './Services';
import { PodsStatus } from './PodsStatus';
interface Props {
  namespace: string;
  name: string;
}
const ReplicasetDetail: React.FC<Props> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'replicaset',
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
      <Metadata
        data={resource?.objectMeta}
        items={[
          <ProDescriptions.Item
            label="Owner"
            render={() => {
              const owner = resource?.objectMeta.ownerReferences.find(
                (item: any) => item.kind == 'Deployment',
              );
              return owner ? (
                <Link
                  to={`/apps/info/deployment/${resource?.objectMeta.namespace}/${owner.name}`}
                >
                  {owner.name}
                </Link>
              ) : (
                'Unknown'
              );
            }}
          />,
        ]}
      />
      <Divider />
      <Card title="资源信息">
        <ProDescriptions layout="vertical" column={1}>
          <ProDescriptions.Item
            dataIndex="containerImages"
            label="Images"
            render={() => (
              <Space size="small" wrap>
                {(resource?.containerImages || []).map((item: string) => (
                  <Tag bordered={false} style={{ margin: 0 }}>
                    {item}
                  </Tag>
                ))}
              </Space>
            )}
          />
          <ProDescriptions.Item
            dataIndex="matchLabels"
            label="Selector"
            render={() => (
              <Space size="small" wrap>
                {Object.entries(resource?.selector.matchLabels || {}).map(
                  ([key, value]) => (
                    <Tag bordered={false} style={{ margin: 0 }}>
                      {`${key}: ${value}`}
                    </Tag>
                  ),
                )}
              </Space>
            )}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <PodsStatus data={resource?.podInfo || {}} />
      <Divider />
      <ResourcePods type="replicaset" namespace={namespace} name={name} />
      <Divider />
      <Services type="replicaset" name={name} namespace={namespace} />
    </>
  );
};

export default ReplicasetDetail;
