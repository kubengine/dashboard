import { Link } from '@umijs/max';
import { Tag } from 'antd';
import React from 'react';

export interface ResourceRow {
  objectMeta: {
    name: string;
    namespace?: string;
    uid?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  [key: string]: any;
}
export const groups = [
  { key: 'workloads', label: '工作负载' },
  { key: 'network', label: '服务与网络' },
  { key: 'storage', label: '配置与存储' },
  { key: 'cluster', label: '集群与事件' },
];
export const catalog = [
  { kind: 'pod', title: 'Pods', group: 'workloads', key: 'pods' },
  {
    kind: 'deployment',
    title: 'Deployments',
    group: 'workloads',
    key: 'deployments',
  },
  {
    kind: 'statefulset',
    title: 'StatefulSets',
    group: 'workloads',
    key: 'statefulSets',
  },
  {
    kind: 'daemonset',
    title: 'DaemonSets',
    group: 'workloads',
    key: 'daemonSets',
  },
  {
    kind: 'replicaset',
    title: 'ReplicaSets',
    group: 'workloads',
    key: 'replicaSets',
  },
  { kind: 'job', title: 'Jobs', group: 'workloads', key: 'jobs' },
  { kind: 'cronjob', title: 'CronJobs', group: 'workloads', key: 'cronJobs' },
  {
    kind: 'horizontalpodautoscaler',
    title: 'HPA',
    group: 'workloads',
    key: 'items',
  },
  { kind: 'service', title: 'Services', group: 'network', key: 'services' },
  { kind: 'ingress', title: 'Ingresses', group: 'network', key: 'items' },
  {
    kind: 'ingressclass',
    title: 'IngressClasses',
    group: 'network',
    key: 'items',
    cluster: true,
  },
  {
    kind: 'networkpolicy',
    title: 'NetworkPolicies',
    group: 'network',
    key: 'items',
  },
  { kind: 'configmap', title: 'ConfigMaps', group: 'storage', key: 'items' },
  { kind: 'secret', title: 'Secrets', group: 'storage', key: 'secrets' },
  {
    kind: 'persistentvolumeclaim',
    title: 'PVC',
    group: 'storage',
    key: 'items',
  },
  {
    kind: 'persistentvolume',
    title: 'PV',
    group: 'storage',
    key: 'items',
    cluster: true,
  },
  {
    kind: 'storageclass',
    title: 'StorageClasses',
    group: 'storage',
    key: 'items',
    cluster: true,
  },
  {
    kind: 'node',
    title: '节点',
    group: 'cluster',
    key: 'nodes',
    cluster: true,
  },
  {
    kind: 'namespace',
    title: '命名空间',
    group: 'cluster',
    key: 'namespaces',
    cluster: true,
  },
  { kind: 'event', title: '事件', group: 'cluster', key: 'events' },
];
export const relatedKinds = new Set([
  'deployment',
  'statefulset',
  'daemonset',
  'replicaset',
  'service',
  'node',
  'job',
  'cronjob',
]);
export const resourcePath = (
  kind: string,
  namespace: string | undefined,
  name: string,
) =>
  `/resources/${kind}/${encodeURIComponent(
    namespace || '_cluster',
  )}/${encodeURIComponent(name)}`;
export const ResourceLink: React.FC<{
  kind?: string;
  namespace?: string;
  name?: string;
}> = ({ kind, namespace, name }) => {
  const type = kind?.toLowerCase();
  return name && catalog.some((entry) => entry.kind === type) ? (
    <Link to={resourcePath(type!, namespace, name)}>{name}</Link>
  ) : (
    <>{name || '—'}</>
  );
};
export const Status: React.FC<{ value?: string }> = ({ value }) => {
  const color = /Failed|Error|BackOff|Warning|Lost|False|NotReady/.test(
    value || '',
  )
    ? 'error'
    : /Running|Ready|Active|Bound|Complete|Succeeded|Normal|True/.test(
        value || '',
      )
    ? 'success'
    : 'default';
  return <Tag color={color}>{value || '未知'}</Tag>;
};
export const memory = (bytes?: number) =>
  bytes == null ? '—' : `${(bytes / 1024 ** 2).toFixed(1)} Mi`;
export const cpu = (value?: number) =>
  value == null ? '—' : `${Number(value.toFixed(2))} m`;
export const statusText = (kind: string, row: ResourceRow): string => {
  if (typeof row.status === 'string') return row.status;
  if (kind === 'node') return row.ready ? 'Ready' : 'NotReady';
  if (kind === 'event') return row.type;
  if (row.spec?.suspend) return 'Suspended';
  if (row.status?.phase) return row.status.phase;
  const condition = row.status?.conditions?.find(
    (item: any) => item.status === 'True',
  );
  if (condition) return condition.type;
  if (kind === 'job') return row.status?.active ? 'Running' : 'Pending';
  if (kind === 'cronjob') return 'Active';
  if (row.podInfo)
    return `${row.readyReplicas ?? row.podInfo.running} / ${
      row.podInfo.desired
    } 就绪`;
  return '—';
};
export function summary(kind: string, row: ResourceRow): React.ReactNode {
  if (kind === 'pod')
    return (
      <span>
        {row.nodeName || '待调度'} · 重启 {row.restartCount || 0}
      </span>
    );
  if (kind === 'service')
    return `${row.type} · ${row.clusterIP || '—'} · ${(
      row.internalEndpoint?.ports || []
    )
      .map((p: any) => `${p.port}/${p.protocol}`)
      .join(', ')}`;
  if (kind === 'ingress') return (row.hosts || []).join(', ') || '默认后端';
  if (kind === 'job')
    return `完成 ${row.status?.succeeded || 0} / ${
      row.spec?.completions ?? 1
    } · 失败 ${row.status?.failed || 0}`;
  if (kind === 'cronjob')
    return `${row.spec?.schedule || '—'} · ${
      row.spec?.timeZone || '控制面时区'
    } · 活跃任务 ${row.status?.active?.length || 0}`;
  if (kind === 'horizontalpodautoscaler')
    return `${row.spec?.scaleTargetRef?.kind}/${
      row.spec?.scaleTargetRef?.name
    } · 副本 ${row.status?.currentReplicas ?? 0} → ${
      row.status?.desiredReplicas ?? '—'
    } · 范围 ${row.spec?.minReplicas ?? 1}–${row.spec?.maxReplicas}`;
  if (kind === 'node')
    return `CPU ${
      (row.allocatedResources?.cpuCapacity || 0) / 1000
    } 核 · 内存 ${memory(row.allocatedResources?.memoryCapacity)}`;
  if (kind === 'persistentvolume' || kind === 'persistentvolumeclaim')
    return `${row.capacity?.storage || '—'} · ${
      row.storageClass || '默认存储类'
    } · ${(row.accessModes || []).join(', ')}`;
  if (kind === 'configmap' || kind === 'secret')
    return `${kind === 'secret' ? row.type + ' · ' : ''}${
      Object.keys(row.data || {}).length
    } 个数据项`;
  if (row.containerImages) return row.containerImages.join(', ') || '—';
  if (kind === 'storageclass') return row.provisioner || '查看详情';
  return '查看详情';
}
