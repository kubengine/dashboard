import services from '@/services';
import { ProDescriptions } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card, Divider, Space, Table } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
interface Props {
  namespace: string;
  name: string;
}
const IngressDetail: React.FC<Props> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();
  const [rules, setRules] = useState<any[]>([]);

  /**
   * 整合 spec 中的 tls、rules、paths 数据
   * @param spec 根配置对象
   * @returns 整合后的结构化数据数组
   */
  const combineSpecData = (spec: any) => {
    // 边界处理：防止 tls/rules 为 undefined/null
    const tlsList = spec.tls || [];
    const ruleList = spec.rules || [];
    // 最终整合结果数组
    const result: any[] = [];

    // 第一步：遍历 rules 数组
    ruleList.forEach((rule: any) => {
      const { host: ruleHost, http } = rule;
      const paths = http?.paths || []; // 边界处理：防止 paths 不存在

      // 第二步：匹配当前 ruleHost 对应的 tls secretName
      const matchedTls = tlsList.find((tls: any) => {
        return tls.hosts?.includes(ruleHost); // 匹配 tls 中包含当前域名的项
      });
      const secretName = matchedTls?.secretName || '无证书配置';

      // 第三步：遍历 paths 数组，组合最终数据
      paths.forEach((pathItem: any) => {
        const { path, pathType, backend } = pathItem;
        // 组合单条整合数据
        result.push({
          host: ruleHost,
          tls_name: secretName,
          path: path,
          pathType: pathType,
          service_name: backend?.service?.name || '无后端服务',
          service_port: backend?.service?.port?.number || 0,
          // 可选：保留原始完整数据，方便后续扩展
          //   raw: {
          //     tls: matchedTls,
          //     rule,
          //     pathItem,
          //   },
        });
      });
    });

    return result;
  };

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'ingress',
      namespace,
      name,
    );
    if (code == 200) {
      setResource(data);
      setRules(combineSpecData(data?.spec || {}));
    }
  };
  const columns = [
    {
      title: '主机',
      dataIndex: 'host',
      key: 'host',
      width: 150,
      render: (host: string) => (
        <a href={`https://${host}`} target="_blank" rel="noopener noreferrer">
          {host}
        </a>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 150,
      render: (path: string, record: any) => (
        <a
          href={`https://${record.host}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {path}
        </a>
      ),
    },
    {
      title: '路径类别',
      dataIndex: 'pathType',
      key: 'pathType',
      width: 150,
    },
    {
      title: '服务名称',
      dataIndex: 'service_name',
      key: 'service_name',
      width: 150,
      render: (service_name: string) => (
        <Link
          to={`/apps/info/service/${resource?.objectMeta.namespace}/${service_name}`}
        >
          {service_name}
        </Link>
      ),
    },
    {
      title: '服务端口',
      dataIndex: 'service_port',
      key: 'service_port',
      width: 150,
    },
    {
      title: 'TLS Secret',
      dataIndex: 'tls_name',
      key: 'tls_name',
      width: 150,
      render: (tls_name: string) => (
        <Link
          to={`/apps/info/secret/${resource?.objectMeta.namespace}/${tls_name}`}
        >
          {tls_name}
        </Link>
      ),
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
      <Card title="资源信息">
        <ProDescriptions layout="vertical" column={1} dataSource={resource}>
          <ProDescriptions.Item
            dataIndex={['spec', 'ingressClassName']}
            label="Ingress 类名"
          />
          <ProDescriptions.Item
            label="Endpoints"
            render={() => (
              <Space direction="vertical" size="small">
                {(resource?.endpoints || []).map((item: any) => (
                  <a
                    href={
                      item.ports
                        ? `http://${item.host}:${item.ports}`
                        : `http://${item.host}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.host}
                  </a>
                ))}
              </Space>
            )}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <Card title="Rules">
        <Table columns={columns} dataSource={rules} pagination={false} />
      </Card>
    </>
  );
};

export default IngressDetail;
