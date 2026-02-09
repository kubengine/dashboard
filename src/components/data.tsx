interface ObjectMeta {
  name: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  creationTimestamp: string;
  uid: string;
}

interface TypeMeta {
  kind: string;
}

interface AllocatedResources {
  cpuRequests: number;
  cpuRequestsFraction: number;
  cpuLimits: number;
  cpuLimitsFraction: number;
  cpuCapacity: number;
  memoryRequests: number;
  memoryRequestsFraction: number;
  memoryLimits: number;
  memoryLimitsFraction: number;
  memoryCapacity: number;
  allocatedPods: number;
  podCapacity: number;
  podFraction: number;
}

interface NodeInfo {
  machineID: string;
  systemUUID: string;
  bootID: string;
  kernelVersion: string;
  osImage: string;
  containerRuntimeVersion: string;
  kubeletVersion: string;
  kubeProxyVersion: string;
  operatingSystem: string;
  architecture: string;
}

interface Condition {
  type: string;
  status: string;
  lastProbeTime: string;
  lastTransitionTime: string;
  reason: string;
  message: string;
}

interface DataPoint {
  x: number;
  y: number;
}

interface DataPoint2 {
  x: string;
  y: number;
  type: string;
}

interface DataPoint3 {
  name: string;
  total: number;
  use: number;
}

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface CumulativeMetric {
  dataPoints: DataPoint[];
  metricPoints: MetricPoint[];
  metricName: string;
  aggregation: string;
}

interface PodStatus {
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  terminating: number;
}

interface PodMetrics {
  cpuUsage: number;
  memoryUsage: number;
  cpuUsageHistory: MetricPoint[];
  memoryUsageHistory: MetricPoint[];
}

interface ContainerStatus {
  name: string;
  state: string;
  ready: boolean;
}

interface PodAllocatedResources {
  cpuRequests: number;
  cpuLimits: number;
  memoryRequests: number;
  memoryLimits: number;
}

interface Pod {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  status: string;
  restartCount: number;
  metrics: PodMetrics;
  warnings: any[];
  nodeName: string;
  containerImages: string[];
  containerStatuses: ContainerStatus[];
  allocatedResources: PodAllocatedResources;
}

// 端口信息接口
interface ServicePort {
  port: number;
  protocol: 'TCP' | 'UDP' | 'SCTP' | string;
  nodePort?: number;
  targetPort?: number | string;
  name?: string;
}

// 端点信息接口
interface Endpoint {
  host: string;
  ports: ServicePort[];
}

// 外部端点接口（可能包含负载均衡器信息）
interface ExternalEndpoint {
  host?: string;
  ip?: string;
  ports: ServicePort[];
}

// 主 Service 信息接口
interface Service {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  internalEndpoint: Endpoint;
  externalEndpoints: ExternalEndpoint[];
  selector: Record<string, string>;
  type: ServiceType;
  clusterIP: string;

  // 可选的其他字段
  sessionAffinity?: string;
  loadBalancerIP?: string;
  externalTrafficPolicy?: string;
  healthCheckNodePort?: number;
  publishNotReadyAddresses?: boolean;
}

// Service 类型枚举
type ServiceType =
  | 'ClusterIP'
  | 'NodePort'
  | 'LoadBalancer'
  | 'ExternalName'
  | string;

interface PodList {
  listMeta: {
    totalItems: number;
  };
  cumulativeMetrics: CumulativeMetric[];
  status: PodStatus;
  pods: Pod[];
  errors: any[];
}

interface EventList {
  listMeta: {
    totalItems: number;
  };
  events: any[];
  errors: any;
}

interface Taint {
  key: string;
  effect: string;
}

interface Address {
  type: string;
  address: string;
}

// 使用拆分接口重新定义主接口
interface KubernetesNodeDetail {
  objectMeta: ObjectMeta;
  typeMeta: TypeMeta;
  ready: string;
  allocatedResources: AllocatedResources;
  nodeInfo: NodeInfo;
  phase: string;
  podCIDR: string;
  providerID: string;
  unschedulable: boolean;
  conditions: Condition[];
  containerImages: string[];
  podList: PodList;
  eventList: EventList;
  metrics: CumulativeMetric[];
  taints: Taint[];
  addresses: Address[];
  errors: any[];
}

interface KubernetesNodeData {
  key: string;
  name: string;
  labels: Record<string, string>; // 对象格式的标签
  creationTimestamp: string;
  ready: boolean;
  cpuRequests: number;
  cpuRequestsFraction: number;
  cpuLimits: number;
  cpuLimitsFraction: number;
  cpuCapacity: number;
  memoryRequests: number;
  memoryRequestsFraction: number;
  memoryLimits: number;
  memoryLimitsFraction: number;
  memoryCapacity: number;
  allocatedPods: number;
  podFraction: number;
}

// 导出所有接口
export type {
  Address,
  AllocatedResources,
  Condition,
  ContainerStatus,
  CumulativeMetric,
  DataPoint,
  DataPoint2,
  DataPoint3,
  Endpoint,
  EventList,
  ExternalEndpoint,
  KubernetesNodeData,
  KubernetesNodeDetail,
  MetricPoint,
  NodeInfo,
  ObjectMeta,
  Pod,
  PodAllocatedResources,
  PodList,
  PodMetrics,
  PodStatus,
  Service,
  ServicePort,
  ServiceType,
  Taint,
  TypeMeta,
};
