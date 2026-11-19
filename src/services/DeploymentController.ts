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
  action: 'scale' | 'restart';
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
}

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
  action: 'scale' | 'restart',
  data: OperationCommand,
) =>
  request<API.Result>(`${base(namespace, name)}/${action}`, {
    method: 'POST',
    errorMode: 'local',
    data,
  });
