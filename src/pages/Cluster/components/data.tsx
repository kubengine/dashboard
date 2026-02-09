/**
 * 元数据对象接口（对应 objectMeta）
 */
interface ObjectMeta {
  /** 资源名称 */
  name: string;
  /** 命名空间 */
  namespace: string;
  /** 标签键值对 */
  labels: Record<string, string>;
  /** 注解键值对 */
  annotations: Record<string, string>;
  /** 创建时间戳（ISO 格式字符串） */
  creationTimestamp: string;
  /** 资源唯一标识 */
  uid: string;
}

/**
 * 类型元数据接口（对应 typeMeta）
 */
interface TypeMeta {
  /** 资源类型（如 statefulset） */
  kind: string;
  /** 是否可扩容 */
  scalable: boolean;
  /** 是否可重启 */
  restartable: boolean;
}

/**
 * Pod 状态信息接口（对应 podInfo）
 */
interface StatefulSetPodInfo {
  /** 当前副本数 */
  current: number;
  /** 期望副本数 */
  desired: number;
  /** 运行中副本数 */
  running: number;
  /** 待调度副本数 */
  pending: number;
  /** 失败副本数 */
  failed: number;
  /** 成功完成副本数 */
  succeeded: number;
  /** 警告信息列表（当前为空数组，可扩展具体警告类型） */
  warnings: string[];
}

/**
 * 顶级资源接口（对应整个 JSON 数据）
 */
interface StatefulSetResource {
  /** 对象元数据 */
  objectMeta: ObjectMeta;
  /** 类型元数据 */
  typeMeta: TypeMeta;
  /** Pod 状态信息 */
  podInfo: StatefulSetPodInfo;
  /** 容器镜像列表 */
  containerImages: string[];
  /** 初始化容器镜像列表（可为 null） */
  initContainerImages: string[] | null;
  /** 错误信息列表（当前为空数组，可扩展具体错误类型） */
  errors: string[];
}

interface MetricPoint {
  timestamp: string;
  value: number;
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
  protocol: "TCP" | "UDP" | "SCTP" | string;
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

// Service 类型枚举
type ServiceType =
  | "ClusterIP"
  | "NodePort"
  | "LoadBalancer"
  | "ExternalName"
  | string;

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