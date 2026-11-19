import { request } from '@umijs/max';

const base = (kind: string, namespace: string, name: string) =>
  `/api/v1/k8s/manifest/${encodeURIComponent(kind)}/${encodeURIComponent(
    namespace,
  )}/${encodeURIComponent(name)}`;

export interface YamlChange {
  yaml_text: string;
  uid: string;
  resource_version: string;
  comment: string;
  reveal_secret: boolean;
}
export interface ChangedField {
  path: string;
  action: 'add' | 'remove' | 'replace';
  before: unknown;
  after: unknown;
  redacted: boolean;
}
export interface YamlPreview {
  changes: ChangedField[];
  previewHash: string;
  beforeYaml: string;
  afterYaml: string;
  noChanges: boolean;
}
export interface Revision {
  id: number;
  version: number;
  actor: string;
  comment: string;
  status: string;
  createdAt: string;
  beforeResourceVersion: string;
  afterResourceVersion: string;
  changedPaths: string[];
  error: string;
  beforeYaml?: string;
  afterYaml?: string;
  requestedYaml?: string;
  changes?: ChangedField[];
  redacted?: boolean;
}
export const editor = (
  kind: string,
  namespace: string,
  name: string,
  reveal_secret: boolean,
) =>
  request<API.Result>(base(kind, namespace, name) + '/edit', {
    method: 'GET',
    params: { reveal_secret },
    errorMode: 'local',
  });
export const preview = (
  kind: string,
  namespace: string,
  name: string,
  data: YamlChange,
) =>
  request<API.Result>(base(kind, namespace, name) + '/preview', {
    method: 'POST',
    data,
    timeout: 90000,
    errorMode: 'local',
  });
export const apply_yaml = (
  kind: string,
  namespace: string,
  name: string,
  data: YamlChange & { request_id: string; preview_hash: string },
) =>
  request<API.Result>(base(kind, namespace, name) + '/apply', {
    method: 'POST',
    data,
    timeout: 120000,
    errorMode: 'local',
  });
export const versions = (
  kind: string,
  namespace: string,
  name: string,
  page: number,
  signal?: AbortSignal,
) =>
  request<API.Result>(base(kind, namespace, name) + '/versions', {
    method: 'GET',
    params: { page, page_size: 10 },
    signal,
    errorMode: 'local',
  });
export const version = (
  kind: string,
  namespace: string,
  name: string,
  id: number,
  reveal_secret: boolean,
) =>
  request<API.Result>(base(kind, namespace, name) + '/versions/' + id, {
    method: 'GET',
    params: { reveal_secret },
    errorMode: 'local',
  });
