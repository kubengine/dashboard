import Labels from '@/components/Labels';
import { getRelativeTime } from '@/utils/time';
import { ProDescriptions } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card } from 'antd';
import dayjs from 'dayjs';

interface MetadataProps {
  title?: string;
  data: any;
  linkType?: string;
  items?: React.ReactNode[];
}
export const Metadata: React.FC<MetadataProps> = ({
  title = 'Metadata',
  data,
  linkType,
  items,
}) => {
  return (
    <Card title={title}>
      <ProDescriptions dataSource={data || {}} layout="vertical">
        <ProDescriptions.Item
          dataIndex="name"
          label="Name"
          render={(_, record) =>
            linkType ? (
              <Link
                to={`/apps/info/${linkType}/${record.namespace}/${record.name}`}
              >
                {record.name}
              </Link>
            ) : (
              record.name
            )
          }
        />
        <ProDescriptions.Item dataIndex="uid" label="UID" />
        <ProDescriptions.Item
          dataIndex="creationTimestamp"
          label="创建时间"
          renderText={(data) => {
            return dayjs(data).format('YYYY-MM-DD HH:mm');
          }}
        />
        <ProDescriptions.Item
          dataIndex="creationTimestamp"
          label="创建于"
          renderText={(data) => {
            return getRelativeTime(data);
          }}
        />
        {data?.labels ? (
          <ProDescriptions.Item
            dataIndex="labels"
            label="标签"
            render={(_, record) => (
              <Labels labels={record.labels || {}} key={`la-${record.name}`} />
            )}
          />
        ) : (
          <></>
        )}
        {data?.annotations ? (
          <ProDescriptions.Item
            dataIndex="annotations"
            label="注解"
            render={(_, record) => (
              <Labels
                labels={record.annotations || {}}
                key={`an-${record.name}`}
              />
            )}
          />
        ) : (
          <></>
        )}

        {items?.map((item) => item)}
      </ProDescriptions>
    </Card>
  );
};
