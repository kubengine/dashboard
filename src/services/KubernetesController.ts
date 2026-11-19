import { request } from '@umijs/max';
export async function overview() {
  return request<API.Result>('/api/v1/k8s/overview', {
    method: 'GET',
    errorMode: 'local',
  });
}

export async function node(name: string) {
  // 初始化空的 params 对象
  const params: Record<string, string> = {};

  // 仅当 name 有有效值（非 undefined、非空字符串）时，才添加到 params
  if (name && name.trim()) {
    params.name = name.trim();
  }
  return request<API.Result>('/api/v1/k8s/node', { method: 'GET', params });
}

// export async function get_stateful_set(namespace: string, name: string) {
//     return request<API.Result>(`/api/v1/k8s/dashboard/statefulset/${namespace}/${name}`, { method: 'GET', });
// }

// export async function get_stateful_set_pod(namespace: string, name: string, page_size: number = 10, page: number = 1) {
//     const params: Record<string, any> = {};
//     params.page_size = page_size
//     params.page = page
//     return request<API.Result>(`/api/v1/k8s/dashboard/statefulsetpod/${namespace}/${name}`, { method: 'GET', params });
// }

export async function resource(
  type: string,
  namespace: string = '',
  name: string = '',
  page_size: number = 10,
  page: number = 1,
) {
  const params: Record<string, any> = {};
  params.page_size = page_size;
  params.page = page;
  if (namespace && namespace.trim()) {
    params.namespace = namespace.trim();
  }
  if (name && name.trim()) {
    params.name = name.trim();
  }
  return request<API.Result>(`/api/v1/k8s/resource/${type}`, {
    method: 'GET',
    params,
  });
}

export async function resource_detail(
  type: string,
  namespace: string,
  name: string,
  signal?: AbortSignal,
) {
  return request<API.Result>(
    `/api/v1/k8s/resourcedetail/${type}/${encodeURIComponent(
      namespace,
    )}/${name}`,
    { method: 'GET', signal },
  );
}

export async function resource_pod(
  type: string,
  namespace: string,
  name: string,
  page_size: number = 10,
  page: number = 1,
  signal?: AbortSignal,
) {
  const params: Record<string, any> = {};
  params.page_size = page_size;
  params.page = page;
  return request<API.Result>(
    `/api/v1/k8s/resourcepod/${type}/${encodeURIComponent(
      namespace,
    )}/${encodeURIComponent(name)}`,
    { method: 'GET', params, signal },
  );
}
/** 资源中心使用的 SDK 原生只读接口。 */
export async function browse(
  type: string,
  params: Record<string, any>,
  signal?: AbortSignal,
) {
  return request<API.Result>(`/api/v1/k8s/resource/${type}`, {
    method: 'GET',
    errorMode: 'local',
    params,
    signal,
  });
}
export async function manifest(
  type: string,
  namespace: string,
  name: string,
  reveal_secret = false,
  signal?: AbortSignal,
) {
  return request<API.Result>(
    `/api/v1/k8s/manifest/${type}/${encodeURIComponent(
      namespace,
    )}/${encodeURIComponent(name)}`,
    { method: 'GET', errorMode: 'local', params: { reveal_secret }, signal },
  );
}
export async function events(
  type: string,
  namespace: string,
  name: string,
  page = 1,
  signal?: AbortSignal,
) {
  return request<API.Result>(
    `/api/v1/k8s/events/${type}/${encodeURIComponent(
      namespace,
    )}/${encodeURIComponent(name)}`,
    {
      method: 'GET',
      errorMode: 'local',
      params: { page, page_size: 10 },
      signal,
    },
  );
}
export async function logs(
  namespace: string,
  name: string,
  params: Record<string, any>,
  signal?: AbortSignal,
) {
  return request<API.Result>(
    `/api/v1/k8s/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(
      name,
    )}/logs`,
    { method: 'GET', errorMode: 'local', params, signal },
  );
}
