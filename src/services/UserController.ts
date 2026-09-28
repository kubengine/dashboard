import { request } from '@umijs/max';

export async function login(
  body: API.LoginParams,
  options?: { [key: string]: any },
) {
  return request<API.LoginResult>('/api/v1/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: body,
    ...(options || {}),
  });
}

export async function logout(bearer: string) {
  const result = await request<API.Result>('/api/v1/logout', {
    method: 'POST',
    headers: { Authorization: bearer },
    skipErrorHandler: true,
  });
  if (result.code !== 200) throw new Error(result.message || '令牌撤销失败');
  return result;
}
