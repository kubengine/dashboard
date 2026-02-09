import services from '@/services';
import { getRelativeTime } from '@/utils/time';
import { ProDescriptions } from '@ant-design/pro-components';
import { Card, Divider, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
import { PodsStatus } from './PodsStatus';
interface Props {
  namespace: string;
  name: string;
}
const DeploymentDetail: React.FC<Props> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();
  const [replicaSet, setReplicaSet] = useState<any>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'deployment',
      namespace,
      name,
    );
    if (code == 200) {
      setResource(data);
    }
    const { code: replicaCode, data: replicaData } =
      await services.KubernetesController.resource_detail(
        'deployment',
        namespace,
        encodeURIComponent(encodeURIComponent(`${name}/newreplicaset`)),
      );
    if (replicaCode == 200) {
      setReplicaSet(replicaData);
    }
  };
  const columns = [
    {
      title: '类别',
      dataIndex: 'type',
      key: 'type',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
    },
    {
      title: '最后的检测时间',
      dataIndex: 'lastProbeTime',
      key: 'lastProbeTime',
      width: 150,
      render: (lastProbeTime: string) => getRelativeTime(lastProbeTime),
    },
    {
      title: '最后的迁移时间',
      dataIndex: 'lastTransitionTime',
      key: 'lastTransitionTime',
      width: 150,
      render: (lastTransitionTime: string) =>
        getRelativeTime(lastTransitionTime),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
    },
    {
      title: '信息',
      dataIndex: 'message',
      key: 'message',
      width: 150,
    },
  ];

  useEffect(() => {
    if (name && namespace) {
      get_resource();
    }
  }, [namespace, name]);
  return (
    <>
      <Metadata data={resource?.objectMeta} />
      <Divider />
      <PodsStatus data={resource?.pods || {}} />
      <Divider />
      <Card title="资源信息">
        <ProDescriptions layout="vertical" dataSource={resource}>
          <ProDescriptions.Item dataIndex="strategy" label="Strategy" />
          <ProDescriptions.Item
            dataIndex="minReadySeconds"
            label="最小就绪秒数"
          />
          <ProDescriptions.Item
            dataIndex="revisionHistoryLimit"
            label="修订历史限制"
          />
          <ProDescriptions.Item
            dataIndex="selector"
            label="Selector"
            render={(data) => (
              <Space size="small" wrap>
                {Object.entries(data || {}).map(([key, value]) => (
                  <Tag bordered={false} style={{ margin: 0 }}>
                    {key}: {value}
                  </Tag>
                ))}
              </Space>
            )}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <Card title="滚动更新策略">
        <ProDescriptions
          layout="vertical"
          dataSource={resource?.rollingUpdateStrategy}
        >
          <ProDescriptions.Item dataIndex="maxSurge" label="最大峰值" />
          <ProDescriptions.Item
            dataIndex="maxUnavailable"
            label="不可用个数上限"
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <Card title="状况">
        <Table
          columns={columns}
          dataSource={resource?.conditions || []}
          pagination={false}
        />
      </Card>
      <Divider />
      <Metadata
        title="Replica Set"
        data={replicaSet?.objectMeta}
        linkType="replicaset"
      />
    </>
  );
};

export default DeploymentDetail;
