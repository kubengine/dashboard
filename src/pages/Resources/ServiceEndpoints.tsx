import { resource_detail } from '@/services/KubernetesController';
import { getRequestErrorMessage, isSuccessCode } from '@/utils/request';
import { Alert, Card, Table } from 'antd';
import React, { useEffect, useState } from 'react';
import { ResourceLink, Status } from './catalog';

const ServiceEndpoints: React.FC<{ namespace: string; name: string }> = ({
  namespace,
  name,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRows([]);
    resource_detail('service', namespace, name, controller.signal)
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (!isSuccessCode(code))
          throw new Error(message || '服务端点读取失败');
        setRows(data.endpointList?.endpoints || []);
        if (data.errors?.length)
          setError(data.errors.map((e: any) => e.message).join('；'));
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(getRequestErrorMessage(e, '服务端点读取失败'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [namespace, name]);
  return (
    <Card title="服务端点">
      <p className="ke-resource-secondary">
        通过 EndpointSlice 查看实际后端地址与就绪状态。
      </p>
      {error && <Alert type="warning" showIcon message={error} />}
      <Table
        dataSource={rows}
        loading={loading}
        size="small"
        pagination={false}
        rowKey={(row) => `${row.host}-${JSON.stringify(row.ports)}`}
        scroll={{ x: 650 }}
        columns={[
          { title: '地址', dataIndex: 'host' },
          {
            title: '端口',
            dataIndex: 'ports',
            render: (ports: any[]) =>
              ports
                .map((port) => `${port.port}/${port.protocol || 'TCP'}`)
                .join(', '),
          },
          {
            title: '所在节点',
            dataIndex: 'nodeName',
            render: (name: string) => <ResourceLink kind="node" name={name} />,
          },
          {
            title: '就绪状态',
            dataIndex: 'ready',
            render: (ready: boolean) => (
              <Status value={ready ? 'Ready' : 'NotReady'} />
            ),
          },
        ]}
        locale={{ emptyText: '未发现服务端点' }}
      />
    </Card>
  );
};
export default ServiceEndpoints;
