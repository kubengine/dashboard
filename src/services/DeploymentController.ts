import { request } from '@umijs/max';

export interface DeploymentCurrent {
  uid: string;
  resourceVersion: string;
  generation: number;
  replicas: number;
  strategy: string;
  rollingUpdate: {
    maxSurge?: number | string;
    maxUnavailable?: number | string;
  };
  paused: boolean;
  deleting: boolean;
  progressDeadlineSeconds?: number;
  hpas: string[];
  hpaError: string;
  nativeRevision: string;
}

export interface DeploymentOperation {
  id: string;
  requestId: string;
  action: DeploymentAction;
  uid: string;
  actor: string;
  status: string;
  phase: string;
  writeStatus: string;
  beforeReplicas: number;
  targetReplicas: number;
  targetGeneration: number;
  reason: string;
  auditId: string;
  revisionId: number;
  createdAt: string;
  updatedAt: string;
  deadline: string;
  release?: {
    sourceRevision?: string;
    sourceReplicaSetUid?: string;
    containers?: ContainerImage[];
  };
  progress: {
    generation?: number;
    observedGeneration?: number;
    target?: number;
    updated?: number;
    ready?: number;
    available?: number;
    total?: number;
    old?: number;
    nativeRevision?: string;
    diagnostics?: { code: string; message: string }[];
    pods?: { name: string }[];
  };
}

export interface OperationCommand {
  request_id: string;
  uid: string;
  resource_version: string;
  replicas?: number;
  confirm_zero?: boolean;
  containers?: ContainerImage[];
  revision?: string;
  replica_set_uid?: string;
  preview_token?: string;
}

export type DeploymentAction = 'scale' | 'restart' | 'image' | 'rollback';
export interface DeploymentPending {
  action: DeploymentAction;
  body: OperationCommand;
}
export interface ContainerImage {
  name: string;
  image: string;
}
export interface NativeRevision {
  revision: string;
  replicaSet: string;
  replicaSetUid: string;
  createdAt?: string;
  containers: ContainerImage[];
  canRollback: boolean;
  reason: string;
}
export interface DeploymentHistory {
  uid: string;
  resourceVersion: string;
  containers: ContainerImage[];
  items: NativeRevision[];
  limitation: string;
}
export interface ReleasePreview {
  previewToken: string;
  expiresAt: string;
  uid: string;
  resourceVersion: string;
  strategy: { type?: string; rollingUpdate?: object };
  replicas: number;
  changes: {
    path: string;
    action: string;
    before: unknown;
    after: unknown;
    redacted: boolean;
  }[];
}

export const deploymentActionLabels: Record<DeploymentAction, string> = {
  scale: '扩缩容',
  restart: '滚动重启',
  image: '镜像发布',
  rollback: '版本回滚',
};

const base = (namespace: string, name: string) =>
  `/api/v1/k8s/deployments/${encodeURIComponent(
    namespace,
  )}/${encodeURIComponent(name)}`;

export const deployment_operations = (
  namespace: string,
  name: string,
  signal?: AbortSignal,
) =>
  request<API.Result>(`${base(namespace, name)}/operations`, {
    method: 'GET',
    errorMode: 'local',
    signal,
  });

export const submit_deployment_operation = (
  namespace: string,
  name: string,
  action: DeploymentAction,
  data: OperationCommand,
) =>
  request<API.Result>(`${base(namespace, name)}/${action}`, {
    method: 'POST',
    errorMode: 'local',
    data,
  });

export const deployment_history = (
  namespace: string,
  name: string,
  signal?: AbortSignal,
) =>
  request<API.Result>(`${base(namespace, name)}/history`, {
    method: 'GET',
    errorMode: 'local',
    signal,
  });

export const preview_deployment_release = (
  namespace: string,
  name: string,
  action: 'image' | 'rollback',
  data: Omit<OperationCommand, 'request_id'>,
  signal?: AbortSignal,
) =>
  request<API.Result>(`${base(namespace, name)}/${action}/preview`, {
    method: 'POST',
    errorMode: 'local',
    data,
    signal,
  });
