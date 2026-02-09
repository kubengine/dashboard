import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card, Divider, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
interface PVDetailProps {
  namespace: string;
  name: string;
}
const PVDetail: React.FC<PVDetailProps> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'persistentvolume',
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
            dataIndex="claim"
            label="Claim"
            render={(data: any) => (
              <Link to={`/apps/info/pvc/${data}`}>{data}</Link>
            )}
          />
          <ProDescriptions.Item dataIndex="reclaimPolicy" label="回收策略" />
          <ProDescriptions.Item dataIndex="storageClass" label="存储类" />
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
      <Divider />
      <Card title="Source">
        <ProDescriptions layout="vertical" dataSource={resource}>
          <ProDescriptions.Item
            label="Type"
            renderText={() => {
              if (resource?.persistentVolumeSource.csi) {
                return 'CSI';
              }
              return 'Unknown';
            }}
          />
          <ProDescriptions.Item
            label="Driver"
            renderText={() => {
              if (resource?.persistentVolumeSource.csi) {
                return resource?.persistentVolumeSource.csi.driver;
              }
              return 'Unknown';
            }}
          />
          <ProDescriptions.Item
            dataIndex="storageClass"
            label="卷句柄"
            renderText={() => {
              if (resource?.persistentVolumeSource.csi) {
                return resource?.persistentVolumeSource.csi.volumeHandle;
              }
              return 'Unknown';
            }}
          />
          <ProDescriptions.Item
            dataIndex="storageClass"
            label="卷属性"
            render={() => {
              return (
                <ProDescriptions column={1} bordered size="small">
                  {resource?.persistentVolumeSource.csi ? (
                    Object.entries(
                      resource?.persistentVolumeSource.csi.volumeAttributes ||
                        {},
                    ).map(([key, value]) => {
                      return (
                        <ProDescriptions.Item
                          label={key}
                          renderText={() => value}
                        />
                      );
                    })
                  ) : (
                    <></>
                  )}
                </ProDescriptions>
              );
            }}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <Card title="Capacity">
        <ProDescriptions layout="vertical" dataSource={resource} bordered>
          <ProDescriptions.Item
            label="资源名"
            renderText={() => {
              return 'storage';
            }}
          />
          <ProDescriptions.Item
            label="数量"
            renderText={() => {
              return resource?.capacity.storage;
            }}
          />
        </ProDescriptions>
      </Card>
    </>
  );
};

export default PVDetail;
