import { request } from "@umijs/max";
export async function get_projects(project_id_or_name: string = '') {
    var url = '/api/v1/artifacts/projects'
    if (project_id_or_name && project_id_or_name.trim()) {
        url = `/api/v1/artifacts/projects/${project_id_or_name}`
    }
    return request<API.Result>(url, { method: 'GET' });
}
export async function get_repositories(project_name: string, q?: string, page_size: number = 10, page: number = 1) {
    // 初始化空的 params 对象
    const params: Record<string, any> = {};
    params.page_size = page_size
    params.page = page
    // 仅当 name 有有效值（非 undefined、非空字符串）时，才添加到 params
    if (q && q.trim()) {
        params.q = q.trim(); // 额外处理：去除首尾空格，避免无效空格参数
    }
    return request<API.Result>(`/api/v1/artifacts/projects/${project_name}/repositories`, {
        method: 'GET',
        params
    });
}
export async function get_artifacts(project_name: string, repository_name: string, q: string, page_size: number, page: number) {
    const params: Record<string, any> = {};
    params.page_size = page_size
    params.page = page
    if (q && q.trim()) {
        params.q = q.trim();
    }
    return request<API.Result>(`/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}/artifacts`, { method: 'GET', params });
}

export async function get_artifact(
    project_name: string,
    repository_name: string,
    digest: string) {
    return request<API.Result>(
        `/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}/artifacts/${digest}`,
        { method: 'GET' }
    );
}

export async function del_artifact(
    project_name: string,
    repository_name: string,
    digest: string) {
    return request<API.Result>(
        `/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}/artifacts/${digest}`,
        { method: 'DELETE' }
    );
}

export async function chart_values(
    project_name: string,
    repository_name: string,
    digest: string) {
    return request<API.Result>(
        `/api/v1/artifacts/chart_values/${project_name}/${repository_name}/${digest}`,
        { method: 'GET' }
    );
}

export async function get_tags(
    project_name: string,
    repository_name: string,
    digest: string,
    page_size: number, page: number
) {
    const params: Record<string, any> = {
        "page_size": page_size,
        "page": page
    };
    return request<API.Result>(
        `/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}/artifacts/${digest}/tags`,
        { method: 'GET', params }
    );
}

export async function add_artifact_tag(
    project_name: string,
    repository_name: string,
    digest: string,
    tag_name: string
) {
    const body: Record<string, any> = {
        "name": tag_name
    }
    return request<API.Result>(
        `/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}/artifacts/${digest}/tags`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: body,
        }
    );
}

export async function del_artifact_tag(
    project_name: string,
    repository_name: string,
    digest: string,
    tag_name: string
) {
    return request<API.Result>(
        `/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}/artifacts/${digest}/tags/${tag_name}`,
        { method: 'DELETE' }
    );
}

export async function del_repositories(project_name: string, repository_name: string) {
    return request<API.Result>(`/api/v1/artifacts/projects/${project_name}/repositories/${repository_name}`, { method: 'DELETE' });
}