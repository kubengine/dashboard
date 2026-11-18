import PageHeading from '@/components/PageHeading';
import YamlDisplay from '@/components/YamlDisplay';
import {
  events,
  manifest,
  resource_pod,
} from '@/services/KubernetesController';
import { getRelativeTime } from '@/utils/time';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Link, useParams, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import Events from './Events';
import PodAccess from './PodAccess';
import PodLogs, { downloadText } from './PodLogs';
import ServiceEndpoints from './ServiceEndpoints';
import {
  catalog,
  cpu,
  memory,
  relatedKinds,
  ResourceLink,
  resourcePath,
  ResourceRow,
  Status,
  statusText,
} from './catalog';
import './resources.less';

const ObjectFields: React.FC<{ value: Record<string, any> }> = ({ value }) => (
  <Descriptions
    bordered
    column={1}
    size="small"
    items={Object.entries(value || {}).map(([key, value]) => ({
      key,
      label: key,
      children:
        typeof value === 'object' && value !== null ? (
          <pre className="ke-object-value">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          String(value ?? '—')
        ),
    }))}
  />
);
const Detail: React.FC = () => {
  const { type = '', namespace = '', name = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const entry = catalog.find((item) => item.kind === type);
  const allowedTabs = [
    'overview',
    'yaml',
    'events',
    ...(type === 'pod' ? ['logs', 'terminal', 'files'] : []),
    ...(relatedKinds.has(type) ? ['pods'] : []),
  ];
  const tab = allowedTabs.includes(params.get('tab') || '')
    ? params.get('tab')!
    : 'overview';
  const [raw, setRaw] = useState<any>();
  const [yaml, setYaml] = useState('');
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [eventRows, setEventRows] = useState<ResourceRow[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [eventError, setEventError] = useState('');
  const [eventsLoading, setEventsLoading] = useState(false);
  const [pods, setPods] = useState<ResourceRow[]>([]);
  const [podsTotal, setPodsTotal] = useState(0);
  const [podsPage, setPodsPage] = useState(1);
  const [podsLoading, setPodsLoading] = useState(false);
  const [podsError, setPodsError] = useState('');
  useEffect(() => {
    setReveal(false);
    setEventPage(1);
    setPodsPage(1);
  }, [type, namespace, name]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRaw(undefined);
    setYaml('');
    manifest(type, namespace, name, reveal, controller.signal)
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (code != 200) throw new Error(message || '资源读取失败');
        setRaw(data.manifest);
        setYaml(data.yaml);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e.message || '无法获取资源详情');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [type, namespace, name, reveal, refresh]);
  useEffect(() => {
    if (tab !== 'events') return;
    const controller = new AbortController();
    setEventsLoading(true);
    setEventError('');
    setEventRows([]);
    setEventTotal(0);
    events(type, namespace, name, eventPage, controller.signal)
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (code != 200) throw new Error(message || '事件读取失败');
        setEventRows(data.events);
        setEventTotal(data.listMeta.totalItems);
        if (data.errors?.length)
          setEventError(data.errors.map((e: any) => e.message).join('；'));
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setEventError(e.message || '事件读取失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsLoading(false);
      });
    return () => controller.abort();
  }, [type, namespace, name, tab, eventPage, refresh]);
  useEffect(() => {
    if (tab !== 'pods') return;
    const controller = new AbortController();
    setPodsLoading(true);
    setPodsError('');
    setPods([]);
    setPodsTotal(0);
    resource_pod(type, namespace, name, 10, podsPage, controller.signal)
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (code != 200) throw new Error(message || '关联 Pod 读取失败');
        setPods(data.pods || []);
        setPodsTotal(data.listMeta.totalItems);
        if (data.errors?.length)
          setPodsError(data.errors.map((e: any) => e.message).join('；'));
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setPodsError(e.message || '关联 Pod 读取失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setPodsLoading(false);
      });
    return () => controller.abort();
  }, [type, namespace, name, tab, podsPage, refresh]);
  if (!entry)
    return (
      <Alert
        type="error"
        message="不支持的资源类型"
        action={<Link to="/resources/pod">返回资源中心</Link>}
      />
    );
  const spec = raw?.spec || {};
  const status = raw?.status || {};
  const meta = raw?.metadata || {};
  const linked = (kind: string, name?: string, ns = meta.namespace) => (
    <ResourceLink kind={kind} namespace={ns} name={name} />
  );
  const conditions = status.conditions || [];
  const containers = [
    ...(spec.containers || []),
    ...(spec.initContainers || []),
    ...(spec.ephemeralContainers || []),
  ];
  const volumeSource = (volume: any) => {
    if (volume.persistentVolumeClaim)
      return linked(
        'persistentvolumeclaim',
        volume.persistentVolumeClaim.claimName,
      );
    if (volume.configMap) return linked('configmap', volume.configMap.name);
    if (volume.secret) return linked('secret', volume.secret.secretName);
    return Object.keys(volume)
      .filter((key) => key !== 'name')
      .join(', ');
  };
  const overview = (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {type === 'node' && (
        <Link to={`/nodeDetail?name=${encodeURIComponent(name)}`}>
          查看节点资源监控与分配情况
        </Link>
      )}
      {type === 'pod' && (
        <Link
          to={`/apps/info/pod/${encodeURIComponent(
            namespace,
          )}/${encodeURIComponent(name)}`}
        >
          查看 Pod 资源使用监控
        </Link>
      )}
      <Card title="资源信息">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            { key: 'kind', label: '类型', children: raw?.kind || entry.title },
            { key: 'name', label: '名称', children: name },
            {
              key: 'namespace',
              label: '命名空间',
              children: meta.namespace
                ? linked('namespace', meta.namespace, '_cluster')
                : '集群级资源',
            },
            {
              key: 'created',
              label: '创建时间',
              children: meta.creationTimestamp
                ? `${new Date(meta.creationTimestamp).toLocaleString(
                    'zh-CN',
                  )} · ${getRelativeTime(meta.creationTimestamp)}`
                : '—',
            },
            {
              key: 'uid',
              label: 'UID',
              children: <Typography.Text copyable>{meta.uid}</Typography.Text>,
            },
            {
              key: 'owner',
              label: '受控于',
              children: (
                <Space wrap>
                  {(meta.ownerReferences || []).map((owner: any) => (
                    <span key={owner.uid}>
                      {owner.kind} / {linked(owner.kind, owner.name)}
                    </span>
                  ))}
                  {!meta.ownerReferences?.length && '—'}
                </Space>
              ),
            },
            ...(type === 'pod'
              ? [
                  {
                    key: 'phase',
                    label: '运行阶段',
                    children: <Status value={status.phase} />,
                  },
                  {
                    key: 'node',
                    label: '所在节点',
                    children: linked('node', spec.nodeName, '_cluster'),
                  },
                  { key: 'ip', label: 'Pod IP', children: status.podIP || '—' },
                  {
                    key: 'qos',
                    label: 'QoS',
                    children: status.qosClass || '—',
                  },
                  {
                    key: 'serviceaccount',
                    label: '服务账号',
                    children: spec.serviceAccountName || 'default',
                  },
                  {
                    key: 'restarts',
                    label: '容器重启总数',
                    children: (status.containerStatuses || []).reduce(
                      (n: number, c: any) => n + (c.restartCount || 0),
                      0,
                    ),
                  },
                ]
              : []),
            ...(type === 'service'
              ? [
                  { key: 'svcType', label: '服务类型', children: spec.type },
                  {
                    key: 'clusterIP',
                    label: '集群 IP',
                    children: spec.clusterIP || '—',
                  },
                  {
                    key: 'external',
                    label: '外部地址',
                    children:
                      (status.loadBalancer?.ingress || [])
                        .map((e: any) => e.ip || e.hostname)
                        .join(', ') ||
                      (spec.externalIPs || []).join(', ') ||
                      spec.externalName ||
                      '—',
                  },
                  {
                    key: 'selector',
                    label: 'Pod 选择器',
                    children: JSON.stringify(spec.selector || {}),
                  },
                ]
              : []),
            ...(['persistentvolume', 'persistentvolumeclaim'].includes(type)
              ? [
                  {
                    key: 'storage',
                    label: '存储类',
                    children: linked(
                      'storageclass',
                      spec.storageClassName,
                      '_cluster',
                    ),
                  },
                  {
                    key: 'pv',
                    label: '卷',
                    children: linked(
                      'persistentvolume',
                      spec.volumeName,
                      '_cluster',
                    ),
                  },
                  {
                    key: 'pvc',
                    label: '绑定申请',
                    children: linked(
                      'persistentvolumeclaim',
                      spec.claimRef?.name,
                      spec.claimRef?.namespace,
                    ),
                  },
                  {
                    key: 'capacity',
                    label: '容量',
                    children:
                      status.capacity?.storage ||
                      spec.capacity?.storage ||
                      spec.resources?.requests?.storage ||
                      '—',
                  },
                  {
                    key: 'access',
                    label: '访问模式',
                    children: (spec.accessModes || []).join(', '),
                  },
                  {
                    key: 'storagephase',
                    label: '阶段',
                    children: <Status value={status.phase} />,
                  },
                ]
              : []),
          ]}
        />
        <Collapse
          ghost
          items={[
            {
              key: 'labels',
              label: `标签与注解 · ${
                Object.keys(meta.labels || {}).length
              } 个标签`,
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    {Object.entries(meta.labels || {}).map(([key, value]) => (
                      <Tag key={key}>
                        {key}: {String(value)}
                      </Tag>
                    ))}
                  </Space>
                  <ObjectFields value={meta.annotations || {}} />
                </Space>
              ),
            },
          ]}
        />
      </Card>
      {conditions.length > 0 && (
        <Card title="运行状况">
          <Table
            size="small"
            dataSource={conditions}
            rowKey="type"
            pagination={false}
            scroll={{ x: 800 }}
            columns={[
              { title: '条件', dataIndex: 'type', width: 190 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (value: string) => <Status value={value} />,
              },
              { title: '原因', dataIndex: 'reason', width: 190 },
              { title: '信息', dataIndex: 'message' },
              {
                title: '最后变更',
                dataIndex: 'lastTransitionTime',
                width: 180,
              },
            ]}
          />
        </Card>
      )}
      {type === 'pod' && (
        <Card title="容器与挂载">
          <Collapse
            items={containers.map((c: any) => {
              const state = [
                ...(status.containerStatuses || []),
                ...(status.initContainerStatuses || []),
                ...(status.ephemeralContainerStatuses || []),
              ].find((item: any) => item.name === c.name);
              return {
                key: c.name,
                label: (
                  <Space wrap>
                    <strong>{c.name}</strong>
                    <Tag>
                      {(spec.initContainers || []).includes(c)
                        ? 'Init'
                        : (spec.ephemeralContainers || []).includes(c)
                        ? '临时容器'
                        : '容器'}
                    </Tag>
                    <Status
                      value={
                        state?.state?.waiting?.reason ||
                        state?.state?.terminated?.reason ||
                        (state?.ready
                          ? 'Ready'
                          : state?.state?.running
                          ? 'Running'
                          : 'Unknown')
                      }
                    />
                  </Space>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Descriptions
                      column={{ xs: 1, md: 2 }}
                      items={[
                        { key: 'image', label: '镜像', children: c.image },
                        {
                          key: 'restart',
                          label: '重启次数',
                          children: state?.restartCount || 0,
                        },
                        {
                          key: 'resources',
                          label: '资源请求与限制',
                          children: (
                            <pre className="ke-object-value">
                              {JSON.stringify(c.resources || {}, null, 2)}
                            </pre>
                          ),
                        },
                        {
                          key: 'ports',
                          label: '端口',
                          children:
                            (c.ports || [])
                              .map(
                                (p: any) =>
                                  `${p.containerPort}/${p.protocol || 'TCP'}`,
                              )
                              .join(', ') || '—',
                        },
                      ]}
                    />
                    <Collapse
                      items={[
                        {
                          key: 'config',
                          label: '命令、环境变量与探针',
                          children: (
                            <ObjectFields
                              value={{
                                command: c.command || [],
                                args: c.args || [],
                                env: c.env || [],
                                envFrom: c.envFrom || [],
                                livenessProbe: c.livenessProbe || {},
                                readinessProbe: c.readinessProbe || {},
                                startupProbe: c.startupProbe || {},
                                securityContext: c.securityContext || {},
                              }}
                            />
                          ),
                        },
                      ]}
                    />
                    <Table
                      size="small"
                      dataSource={c.volumeMounts || []}
                      rowKey="mountPath"
                      pagination={false}
                      scroll={{ x: 600 }}
                      columns={[
                        { title: '卷名称', dataIndex: 'name' },
                        { title: '挂载路径', dataIndex: 'mountPath' },
                        {
                          title: '只读',
                          dataIndex: 'readOnly',
                          render: (v: boolean) => (v ? '是' : '否'),
                        },
                        {
                          title: '来源',
                          render: (_: unknown, row: any) =>
                            volumeSource(
                              (spec.volumes || []).find(
                                (v: any) => v.name === row.name,
                              ) || {},
                            ),
                        },
                      ]}
                    />
                  </Space>
                ),
              };
            })}
          />
        </Card>
      )}
      {type === 'service' && (
        <Card title="服务端口">
          <Table
            size="small"
            dataSource={spec.ports || []}
            rowKey={(row: any) => `${row.name}-${row.port}`}
            pagination={false}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '协议', dataIndex: 'protocol' },
              { title: '服务端口', dataIndex: 'port' },
              { title: '目标端口', dataIndex: 'targetPort' },
              { title: '节点端口', dataIndex: 'nodePort' },
            ]}
          />
        </Card>
      )}
      {type === 'service' && (
        <ServiceEndpoints namespace={namespace} name={name} />
      )}
      {type === 'ingress' && (
        <Card title="路由规则">
          <Table
            size="small"
            pagination={false}
            dataSource={(spec.rules || []).flatMap((rule: any) =>
              (rule.http?.paths || []).map((path: any) => ({
                host: rule.host || '*',
                ...path,
              })),
            )}
            rowKey={(row: any) => `${row.host}-${row.path}`}
            columns={[
              { title: '域名', dataIndex: 'host' },
              { title: '路径', dataIndex: 'path' },
              { title: '匹配类型', dataIndex: 'pathType' },
              {
                title: '后端服务',
                render: (_: unknown, row: any) =>
                  linked('service', row.backend?.service?.name),
              },
              {
                title: '端口',
                render: (_: unknown, row: any) =>
                  row.backend?.service?.port?.number ||
                  row.backend?.service?.port?.name,
              },
            ]}
          />
        </Card>
      )}
      {['configmap', 'secret'].includes(type) && (
        <Card title="数据">
          <ObjectFields value={raw?.data || {}} />
          {raw?.binaryData && <ObjectFields value={raw.binaryData} />}
          {type === 'secret' && (
            <p className="ke-resource-secondary">
              显示值时保留 Kubernetes 原始 base64 表示；可通过 YAML 复制或下载。
            </p>
          )}
        </Card>
      )}
      {!['pod', 'service', 'ingress', 'configmap', 'secret'].includes(type) && (
        <Card title="规格与状态">
          <Collapse
            items={[
              {
                key: 'spec',
                label: '资源规格',
                children: (
                  <ObjectFields
                    value={
                      Object.keys(spec).length
                        ? spec
                        : Object.fromEntries(
                            Object.entries(raw || {}).filter(
                              ([key]) =>
                                ![
                                  'metadata',
                                  'apiVersion',
                                  'kind',
                                  'status',
                                ].includes(key),
                            ),
                          )
                    }
                  />
                ),
              },
              {
                key: 'status',
                label: '当前状态',
                children: Object.keys(status).length ? (
                  <ObjectFields value={status} />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="此资源没有状态字段"
                  />
                ),
              },
            ]}
          />
        </Card>
      )}
    </Space>
  );
  return (
    <div className="ke-resources">
      <Link
        className="ke-resource-back"
        to={`/resources/${type}${
          meta.namespace
            ? `?namespace=${encodeURIComponent(meta.namespace)}`
            : ''
        }`}
      >
        <ArrowLeftOutlined aria-hidden="true" /> 返回 {entry.title}
      </Link>
      <PageHeading
        eyebrow={entry.title}
        title={name}
        description={`${
          namespace === '_cluster' ? '集群级资源' : namespace
        } · Kubernetes 资源详情`}
        extra={
          <Button
            icon={<ReloadOutlined aria-hidden="true" />}
            onClick={() => setRefresh((v) => v + 1)}
            loading={loading}
          >
            刷新
          </Button>
        }
      />
      {type === 'secret' && (
        <Alert
          type="info"
          showIcon
          message={
            reveal
              ? 'Secret 值已显示，离开此资源后将重新隐藏。'
              : 'Secret 值默认隐藏，查看前请确认当前屏幕环境。'
          }
          action={
            <Button onClick={() => setReveal((value) => !value)}>
              {reveal ? '隐藏 Secret 值' : '显示 Secret 值'}
            </Button>
          }
        />
      )}
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button onClick={() => setRefresh((v) => v + 1)}>重试</Button>
          }
        />
      )}
      <Tabs
        activeKey={tab}
        onChange={(tab) => setParams({ tab })}
        items={[
          { key: 'overview', label: '概览' },
          ...(relatedKinds.has(type)
            ? [{ key: 'pods', label: '关联 Pods' }]
            : []),
          ...(type === 'pod'
            ? [
                { key: 'logs', label: '容器日志' },
                { key: 'terminal', label: '终端' },
                { key: 'files', label: '文件管理' },
              ]
            : []),
          { key: 'events', label: '事件' },
          { key: 'yaml', label: 'YAML' },
        ]}
      />
      <Spin spinning={loading}>
        {raw && tab === 'overview' && overview}
        {raw && tab === 'logs' && (
          <Card>
            <PodLogs
              key={`${namespace}/${name}`}
              namespace={namespace}
              name={name}
              spec={spec}
            />
          </Card>
        )}
        {raw && (tab === 'terminal' || tab === 'files') && (
          <Card>
            <PodAccess
              key={`${namespace}/${name}`}
              namespace={namespace}
              name={name}
              spec={spec}
              status={status}
              mode={tab}
            />
          </Card>
        )}
        {tab === 'yaml' && raw && (
          <>
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              onClick={() => downloadText(`${type}-${name}.yaml`, yaml)}
            >
              下载 YAML
            </Button>
            <YamlDisplay yamlText={yaml} title="原始 YAML · 只读" />
          </>
        )}
        {tab === 'events' && (
          <Card>
            {eventError && (
              <Alert type="warning" showIcon message={eventError} />
            )}
            <Events
              rows={eventRows}
              loading={eventsLoading}
              total={eventTotal}
              page={eventPage}
              onPage={setEventPage}
            />
          </Card>
        )}
        {tab === 'pods' && (
          <Card>
            {podsError && <Alert type="warning" showIcon message={podsError} />}
            <Table
              size="middle"
              dataSource={pods}
              rowKey={(row) => row.objectMeta.uid || row.objectMeta.name}
              loading={podsLoading}
              scroll={{ x: 1000 }}
              pagination={{
                current: podsPage,
                pageSize: 10,
                total: podsTotal,
                showSizeChanger: false,
                onChange: setPodsPage,
              }}
              columns={[
                {
                  title: 'Pod',
                  width: 280,
                  render: (_: unknown, row: ResourceRow) => (
                    <Link
                      to={resourcePath(
                        'pod',
                        row.objectMeta.namespace,
                        row.objectMeta.name,
                      )}
                    >
                      {row.objectMeta.name}
                    </Link>
                  ),
                },
                {
                  title: '状态',
                  width: 150,
                  render: (_: unknown, row: ResourceRow) => (
                    <Status value={statusText('pod', row)} />
                  ),
                },
                {
                  title: '节点',
                  width: 180,
                  render: (_: unknown, row: ResourceRow) =>
                    linked('node', row.nodeName, '_cluster'),
                },
                {
                  title: 'CPU / 内存',
                  width: 180,
                  render: (_: unknown, row: ResourceRow) =>
                    `${cpu(row.metrics?.cpuUsage)} / ${memory(
                      row.metrics?.memoryUsage,
                    )}`,
                },
                {
                  title: '日志',
                  width: 90,
                  render: (_: unknown, row: ResourceRow) => (
                    <Link
                      to={
                        resourcePath(
                          'pod',
                          row.objectMeta.namespace,
                          row.objectMeta.name,
                        ) + '?tab=logs'
                      }
                    >
                      查看日志
                    </Link>
                  ),
                },
              ]}
            />
          </Card>
        )}
        {!raw && !loading && !error && <Empty description="资源不存在" />}
      </Spin>
    </div>
  );
};
const ResourceDetailPage: React.FC = () => {
  const { type, namespace, name } = useParams();
  return <Detail key={`${type}/${namespace}/${name}`} />;
};
export default ResourceDetailPage;
