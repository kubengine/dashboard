import { request } from '@umijs/max';
const base = (namespace: string, name: string) =>
  `/api/v1/k8s/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(
    name,
  )}`;
export interface PodFile {
  name: string;
  type: 'file' | 'directory' | 'link' | 'other';
  size: number;
  modified: string;
  mode: string;
}
export interface Directory {
  path: string;
  entries: PodFile[];
  windows: boolean;
  container: string;
  maxFileBytes: number;
  transferTimeoutSeconds: number;
}
export const list_files = (
  namespace: string,
  name: string,
  container: string,
  path?: string,
  signal?: AbortSignal,
) =>
  request<API.Result>(base(namespace, name) + '/files', {
    method: 'GET',
    params: { container, path },
    signal,
    skipErrorHandler: true,
  });
export const operate_file = (
  namespace: string,
  name: string,
  container: string,
  data: {
    action: 'mkdir' | 'touch' | 'rename' | 'delete';
    path: string;
    name?: string;
    recursive?: boolean;
  },
) =>
  request<API.Result>(base(namespace, name) + '/files/operations', {
    method: 'POST',
    params: { container },
    data,
    skipErrorHandler: true,
  });
export const upload_file = (
  namespace: string,
  name: string,
  container: string,
  path: string,
  file: File,
  overwrite: boolean,
  onProgress: (value: number) => void,
  transferTimeoutSeconds: number,
) => {
  const data = new FormData();
  data.append('file', file);
  data.append('path', path);
  data.append('overwrite', String(overwrite));
  return request<API.Result>(base(namespace, name) + '/files/upload', {
    method: 'POST',
    params: { container },
    data,
    // 浏览器接收和容器写入分别计时，额外留出响应处理时间。
    timeout: (2 * transferTimeoutSeconds + 60) * 1000,
    skipErrorHandler: true,
    onUploadProgress: (event: any) =>
      onProgress(
        event.total ? Math.round((event.loaded / event.total) * 100) : 0,
      ),
  });
};
export const download_file = (
  namespace: string,
  name: string,
  container: string,
  path: string,
  transferTimeoutSeconds: number,
) =>
  request<Blob>(base(namespace, name) + '/files/download', {
    method: 'GET',
    params: { container, path },
    responseType: 'blob',
    timeout: (transferTimeoutSeconds + 60) * 1000,
  });
export const terminal_url = (
  namespace: string,
  name: string,
  container: string,
  shell: string,
) => {
  const url = new URL(
    base(namespace, name) + '/terminal',
    window.location.href,
  );
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('container', container);
  url.searchParams.set('shell', shell);
  return url.toString();
};
