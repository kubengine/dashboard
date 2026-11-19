import { request } from '@umijs/max';

export type Role = 'platform_admin' | 'namespace_operator' | 'readonly';
export interface ConsoleUser {
  user_id: string;
  username: string;
  enabled: boolean;
  role: Role;
  namespaces: string[];
  sensitive_permissions: string[];
  revision: number;
  permissions?: string[];
}
export const roleLabels: Record<Role, string> = {
  platform_admin: '平台管理员',
  namespace_operator: '命名空间运维',
  readonly: '只读用户',
};
export const sensitiveOptions = [
  { value: 'secret.read', label: 'Secret 明文读取' },
  { value: 'pod.terminal', label: 'Pod 终端' },
  { value: 'pod.files.read', label: 'Pod 文件读取' },
  { value: 'pod.files.write', label: 'Pod 文件修改' },
];
export async function current_user() {
  const result = await request<API.Result>('/api/v1/me', {
    errorMode: 'local',
  });
  return result.data as ConsoleUser;
}
export const list_users = (page: number, page_size: number) =>
  request<API.Result>('/api/v1/users', {
    params: { page, page_size },
    errorMode: 'local',
  });
export const create_user = (data: object) =>
  request<API.Result>('/api/v1/users', {
    method: 'POST',
    data,
    errorMode: 'local',
  });
export const update_user = (user_id: string, data: object) =>
  request<API.Result>(`/api/v1/users/${user_id}`, {
    method: 'PUT',
    data,
    errorMode: 'local',
  });
export const reset_password = (user_id: string, password: string) =>
  request<API.Result>(`/api/v1/users/${user_id}/password`, {
    method: 'POST',
    data: { password },
    errorMode: 'local',
  });
export const change_password = (data: object) =>
  request<API.Result>('/api/v1/me/password', {
    method: 'POST',
    data,
    errorMode: 'local',
  });
export const audit_events = (params: Record<string, unknown>) =>
  request<API.Result>('/api/v1/audit-events', { params, errorMode: 'local' });
