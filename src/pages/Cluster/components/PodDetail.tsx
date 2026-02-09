import { DataPoint2 } from '@/components/data';
import Usage from '@/components/Usage';
import services from '@/services';
import { getRelativeTime } from '@/utils/time';
import { CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import { ProDescriptions } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Card, Col, Divider, Row, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
import PVCs from './PVCs';

interface Props {
  namespace: string;
  name: string;
}
const PodDetail: React.FC<Props> = ({ namespace, name }) => {
  const [resource, setResource] = useState<any>();
  const [cpuUsageRate, setCpuUsageRate] = useState<DataPoint2[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<DataPoint2[]>([]);

  const get_resource = async () => {
    const { code, data } = await services.KubernetesController.resource_detail(
      'pod',
      namespace,
      name,
    );
    if (code == 200) {
      setResource(data);
      const metrics = data['metrics'];
      const cpu_usage_rate = metrics.find(
        (item: any) => item['metricName'] == 'cpu/usage_rate',
      );
      var cpuUsageRate: DataPoint2[] = [];
      cpu_usage_rate['dataPoints'].forEach((item: any) => {
        cpuUsageRate.push({
          x: dayjs(item.x * 1000).format('HH:mm'),
          y: item.y,
          type: 'CPU Usage',
        });
      });
      setCpuUsageRate(cpuUsageRate);
      const memory_usage = metrics.find(
        (item: any) => item['metricName'] == 'memory/usage',
      );
      var memoryUsageRate: DataPoint2[] = [];
      memory_usage['dataPoints'].forEach((item: any) => {
        memoryUsageRate.push({
          x: dayjs(item.x * 1000).format('HH:mm'),
          y: Number((item.y / 1024 / 1024).toFixed(2)),
          type: 'Memory Usage',
        });
      });
      setMemoryUsage(memoryUsageRate);
    }
  };

  useEffect(() => {
    if (name && namespace) {
      get_resource();
    }
  }, [namespace, name]);
  const columns = [
    {
      title: '类别',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 50,
    },
    {
      title: '最后的检测时间',
      dataIndex: 'lastProbeTime',
      key: 'lastProbeTime',
      width: 100,
      render: (lastProbeTime: number) =>
        lastProbeTime
          ? dayjs(lastProbeTime).format('YYYY-MM-DD HH:mm:ss')
          : '-',
    },
    {
      title: '最后的迁移时间',
      dataIndex: 'lastTransitionTime',
      key: 'lastTransitionTime',
      width: 100,
      render: (lastTransitionTime: number) =>
        lastTransitionTime
          ? dayjs(lastTransitionTime).format('YYYY-MM-DD HH:mm:ss')
          : '-',
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
  const mountsColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '只读',
      dataIndex: 'readOnly',
      key: 'readOnly',
      width: 100,
      render: (readOnly: boolean) => (
        <Tag
          bordered={false}
          color={readOnly ? 'green' : 'red'}
          style={{ margin: 0 }}
        >
          {readOnly ? 'True' : 'False'}
        </Tag>
      ),
    },
    {
      title: '挂载路径',
      dataIndex: 'mountPath',
      key: 'mountPath',
      width: 150,
    },
    {
      title: '子路径',
      dataIndex: 'subPath',
      key: 'subPath',
      width: 150,
    },
    {
      title: '源类型',
      key: 'type',
      width: 150,
      render: (_: any, record: any) => {
        // const keys = Object.keys(record.volume)
        if ('configMap' in record.volume) {
          return 'ConfigMap';
        } else if ('persistentVolumeClaim' in record.volume) {
          return 'PersistentVolumeClaim';
        } else if ('secret' in record.volume) {
          return 'Secret';
        } else if ('emptyDir' in record.volume) {
          return 'EmptyDir';
        }
        return '-';
      },
    },
    {
      title: '源名称',
      key: 'typeName',
      width: 150,
      render: (_: any, record: any) => {
        // const keys = Object.keys(record.volume)
        if ('configMap' in record.volume) {
          return (
            <Link
              to={`/apps/info/configmap/${namespace}/${record.volume.configMap.name}`}
            >
              {record.volume.configMap.name}
            </Link>
          );
        } else if ('persistentVolumeClaim' in record.volume) {
          return (
            <Link
              to={`/apps/info/pvc/${namespace}/${record.volume.persistentVolumeClaim.claimName}`}
            >
              {record.volume.persistentVolumeClaim.claimName}
            </Link>
          );
        } else if ('secret' in record.volume) {
          return (
            <Link
              to={`/apps/info/secret/${namespace}/${record.volume.secret.secretName}`}
            >
              {record.volume.secret.secretName}
            </Link>
          );
        }
        return '-';
      },
    },
  ];
  return (
    <>
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <Usage
            dataSource={cpuUsageRate}
            title="CPU Usage"
            yTitle="CPU (cores)"
            unit="m"
          />
        </Col>
        <Col span={12}>
          <Usage
            dataSource={memoryUsage}
            title="Memory Usage"
            yTitle="Memory (bytes)"
            styleFill="l(270) 0:#ffffff 0.2:#7ec2f3 1:#1890ff"
            unit="Mi"
          />
        </Col>
      </Row>
      <Divider />
      <Metadata
        data={resource?.objectMeta}
        items={[
          <ProDescriptions.Item
            label="Owner"
            span={3}
            render={() => {
              return (
                <Space size="small" wrap>
                  {resource?.objectMeta.ownerReferences.map((item: any) => (
                    <Link
                      to={`/apps/info/${item.kind.toLowerCase()}/${
                        resource?.objectMeta.namespace
                      }/${item.name}`}
                    >
                      {item.kind.toLowerCase()}/{item.name}
                    </Link>
                  ))}
                </Space>
              );
            }}
          />,
        ]}
      />
      <Divider />
      <Card title="资源信息">
        <ProDescriptions dataSource={resource} layout="vertical">
          <ProDescriptions.Item dataIndex="nodeName" label="Node" />
          <ProDescriptions.Item dataIndex="podPhase" label="Status" />
          <ProDescriptions.Item dataIndex="podIP" label="Ip" />
          <ProDescriptions.Item dataIndex="qosClass" label="QoS 类" />
          <ProDescriptions.Item dataIndex="restartCount" label="Restarts" />
          <ProDescriptions.Item
            dataIndex="serviceAccountName"
            label="服务账号"
          />
          <ProDescriptions
            dataSource={resource?.securityContext}
            title="安全上下文"
            layout="vertical"
          >
            <ProDescriptions.Item dataIndex="fsGroup" label="文件系统组" />
            <ProDescriptions.Item
              dataIndex="fsGroupChangePolicy"
              label="文件系统组变更策略"
            />
          </ProDescriptions>
        </ProDescriptions>
      </Card>
      <Divider />
      <Card title="状况">
        <Table
          dataSource={resource?.conditions}
          columns={columns}
          rowKey="type"
          pagination={false}
        />
      </Card>
      <Divider />
      <Card title="受控于">
        <ProDescriptions
          dataSource={resource?.controller}
          column={3}
          layout="vertical"
        >
          <ProDescriptions.Item
            dataIndex={['objectMeta', 'name']}
            label="Name"
          />
          <ProDescriptions.Item dataIndex={['typeMeta', 'kind']} label="Kind" />
          <ProDescriptions.Item
            label="Pods"
            renderText={() =>
              `${resource?.controller.pods.running}/${resource?.controller.pods.desired}`
            }
          />
          <ProDescriptions.Item
            dataIndex={['objectMeta', 'creationTimestamp']}
            label="Age"
            span={3}
            renderText={(creationTimestamp) =>
              getRelativeTime(creationTimestamp)
            }
          />
          <ProDescriptions.Item
            label="Labels"
            span={3}
            render={() => (
              <Space size="small" wrap>
                {Object.entries(
                  resource?.controller.objectMeta.labels || {},
                ).map(([key, value]) => (
                  <Tag>{`${key}: ${value}`}</Tag>
                ))}
              </Space>
            )}
          />
          <ProDescriptions.Item
            span={3}
            label="Images"
            render={() => (
              <Space size="small" wrap>
                {(resource?.controller.containerImages || []).map(
                  (item: any) => (
                    <Tag>{item}</Tag>
                  ),
                )}
              </Space>
            )}
          />
        </ProDescriptions>
      </Card>
      <Divider />
      <PVCs namespace={namespace} name={name} type={'pod'} />
      {resource?.containers.map((item: any) => {
        return (
          <>
            <Divider />
            <Card title="Containers">
              <Space direction="vertical" size={'middle'}>
                <ProDescriptions
                  dataSource={item}
                  column={1}
                  layout="vertical"
                  title={
                    <Space>
                      {item.state == 'Running' ? (
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                      ) : (
                        <CloseCircleTwoTone twoToneColor="#eb2f96" />
                      )}
                      {item.name}
                    </Space>
                  }
                >
                  <ProDescriptions.Item
                    dataIndex="image"
                    label="Image"
                    render={(data) => <Tag>{data}</Tag>}
                  />
                </ProDescriptions>
                <ProDescriptions
                  dataSource={item.status}
                  column={10}
                  layout="vertical"
                  title="Status"
                >
                  <ProDescriptions.Item
                    dataIndex="ready"
                    label="Ready"
                    render={(ready) => (
                      <Tag
                        bordered={false}
                        color={ready ? 'green' : 'red'}
                        style={{ margin: 0 }}
                      >
                        {ready ? 'True' : 'False'}
                      </Tag>
                    )}
                  />
                  <ProDescriptions.Item
                    dataIndex="started"
                    label="Started"
                    render={(started) => (
                      <Tag
                        bordered={false}
                        color={started ? 'green' : 'red'}
                        style={{ margin: 0 }}
                      >
                        {started ? 'True' : 'False'}
                      </Tag>
                    )}
                  />
                  <ProDescriptions.Item
                    dataIndex={['state', 'running', 'startedAt']}
                    label="启动于"
                    renderText={(data) =>
                      data ? dayjs(data).format('YYYY-MM-DD HH:mm:ss') : '-'
                    }
                  />
                </ProDescriptions>
                <ProDescriptions column={6} layout="vertical" title="环境变量">
                  {item.env.map((item: any) => (
                    <ProDescriptions.Item
                      label={item.name}
                      renderText={() => item.value}
                    />
                  ))}
                </ProDescriptions>
                <ProDescriptions dataSource={item} column={1} title="Commands">
                  <ProDescriptions.Item
                    valueType="code"
                    dataIndex="commands"
                    renderText={(data) => data.join('\n')}
                  />
                </ProDescriptions>
                <ProDescriptions dataSource={item} column={1} title="参数">
                  <ProDescriptions.Item
                    valueType="code"
                    dataIndex="args"
                    renderText={(data) => data.join('\n')}
                  />
                </ProDescriptions>
                <ProDescriptions title="Mounts" />
                <Table
                  dataSource={item.volumeMounts}
                  columns={mountsColumns}
                  rowKey="name"
                  pagination={false}
                />
                <ProDescriptions
                  dataSource={item.securityContext}
                  column={7}
                  layout="vertical"
                  title="安全上下文"
                >
                  <ProDescriptions.Item
                    dataIndex="runAsUser"
                    label="用户身份"
                  />
                  <ProDescriptions.Item dataIndex="runAsGroup" label="组身份" />
                  <ProDescriptions.Item
                    dataIndex="runAsNonRoot"
                    label="非 Root 身份"
                    render={(runAsNonRoot) => (
                      <Tag
                        bordered={false}
                        color={runAsNonRoot ? 'green' : 'red'}
                        style={{ margin: 0 }}
                      >
                        {runAsNonRoot ? 'True' : 'False'}
                      </Tag>
                    )}
                  />
                  <ProDescriptions.Item
                    dataIndex={['capabilities', 'drop']}
                    label="Seccomp 配置文件类型"
                    renderText={(data) => data.join('\n')}
                  />
                  <ProDescriptions.Item
                    dataIndex={['seccompProfile', 'type']}
                    label="要放弃的权能"
                  />
                  <ProDescriptions.Item
                    dataIndex="readOnlyRootFilesystem"
                    label="只读文件系统"
                    render={(readOnlyRootFilesystem) => (
                      <Tag
                        bordered={false}
                        color={readOnlyRootFilesystem ? 'green' : 'red'}
                        style={{ margin: 0 }}
                      >
                        {readOnlyRootFilesystem ? 'True' : 'False'}
                      </Tag>
                    )}
                  />
                  <ProDescriptions.Item
                    dataIndex="allowPrivilegeEscalation"
                    label="允许特权提升"
                    render={(allowPrivilegeEscalation) => (
                      <Tag
                        bordered={false}
                        color={allowPrivilegeEscalation ? 'green' : 'red'}
                        style={{ margin: 0 }}
                      >
                        {allowPrivilegeEscalation ? 'True' : 'False'}
                      </Tag>
                    )}
                  />
                </ProDescriptions>
                <ProDescriptions
                  dataSource={item.livenessProbe}
                  column={7}
                  layout="vertical"
                  title="存活探针"
                >
                  <ProDescriptions.Item
                    dataIndex="initialDelaySeconds"
                    label="初始延迟（秒）"
                  />
                  <ProDescriptions.Item
                    dataIndex="timeoutSeconds"
                    label="超时时间（秒）"
                  />
                  <ProDescriptions.Item
                    dataIndex="periodSeconds"
                    label="探测周期（秒）"
                  />
                  <ProDescriptions.Item
                    dataIndex="successThreshold"
                    label="成功阈值"
                  />
                  <ProDescriptions.Item
                    dataIndex="failureThreshold"
                    label="失败阈值"
                  />
                  <ProDescriptions.Item
                    dataIndex={['exec', 'command']}
                    label="执行命令"
                    valueType="code"
                    renderText={(data) => data.join('\n')}
                  />
                </ProDescriptions>
                <ProDescriptions
                  dataSource={item.readinessProbe}
                  column={7}
                  layout="vertical"
                  title="就绪探针"
                >
                  <ProDescriptions.Item
                    dataIndex="initialDelaySeconds"
                    label="初始延迟（秒）"
                  />
                  <ProDescriptions.Item
                    dataIndex="timeoutSeconds"
                    label="超时时间（秒）"
                  />
                  <ProDescriptions.Item
                    dataIndex="periodSeconds"
                    label="探测周期（秒）"
                  />
                  <ProDescriptions.Item
                    dataIndex="successThreshold"
                    label="成功阈值"
                  />
                  <ProDescriptions.Item
                    dataIndex="failureThreshold"
                    label="失败阈值"
                  />
                  <ProDescriptions.Item
                    dataIndex={['exec', 'command']}
                    label="执行命令"
                    valueType="code"
                    renderText={(data) => data.join('\n')}
                  />
                </ProDescriptions>
                <ProDescriptions title="资源请求" />
                <Space>
                  {Object.entries(item.resources.requests).map(
                    ([key, value]) => {
                      return <Tag>{`${key}: ${value}`}</Tag>;
                    },
                  )}
                </Space>
              </Space>
            </Card>
          </>
        );
      })}
    </>
  );
};

export default PodDetail;
