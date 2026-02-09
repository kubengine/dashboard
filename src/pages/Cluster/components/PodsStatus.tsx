import { ProDescriptions } from '@ant-design/pro-components';
import { Card } from 'antd';

interface Props {
  data: any;
}
export const PodsStatus: React.FC<Props> = ({ data }) => {
  return (
    <Card title="Pods状态">
      <ProDescriptions dataSource={data}>
        <ProDescriptions.Item dataIndex="running" label="运行中" />
        <ProDescriptions.Item dataIndex="desired" label="达到预期的" />
        <ProDescriptions.Item dataIndex="current" label="当前数量" />
        <ProDescriptions.Item dataIndex="pending" label="等待" />
        <ProDescriptions.Item dataIndex="failed" label="失败" />
        <ProDescriptions.Item dataIndex="succeeded" label="成功" />
      </ProDescriptions>
    </Card>
  );
};
