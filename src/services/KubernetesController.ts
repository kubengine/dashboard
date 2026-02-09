import { request } from "@umijs/max";
export async function overview() {
    return request<API.Result>('/api/v1/k8s/overview', { method: 'GET', });
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
    namespace: string = "",
    name: string = "",
    page_size: number = 10,
    page: number = 1) {
    const params: Record<string, any> = {};
    params.page_size = page_size
    params.page = page
    if (namespace && namespace.trim()) {
        params.namespace = namespace.trim();
    }
    if (name && name.trim()) {
        params.name = name.trim();
    }
    return request<API.Result>(`/api/v1/k8s/dashboard/resource/${type}`, { method: 'GET', params });
}

export async function resource_detail(
    type: string,
    namespace: string,
    name: string) {
    return request<API.Result>(`/api/v1/k8s/dashboard/resourcedetail/${type}/${namespace}/${name}`, { method: 'GET' });
}

export async function resource_pod(
    type: string,
    namespace: string,
    name: string,
    page_size: number = 10,
    page: number = 1) {
    const params: Record<string, any> = {};
    params.page_size = page_size
    params.page = page
    return request<API.Result>(`/api/v1/k8s/dashboard/resourcepod/${type}/${namespace}/${name}`, { method: 'GET', params });
}