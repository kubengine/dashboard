# 接口异常处理约定

统一入口为 `src/utils/request.ts`，与 Umi 请求插件集成；具体策略在可独立测试的 `src/utils/requestPolicy.ts`。服务层通过 `@umijs/max` 的 `request` 发出 HTTP 请求，上传也使用此入口，避免绕过认证、续签和异常处理。

## 成功与失败

- HTTP 2xx 且业务 `code` 为 2xx 才成功。兼容旧接口的 HTTP 200 + 失败 `code`，也兼容 `success: false`。禁止仅判断 `code === 200`，使用 `isSuccessCode(code)`。
- 真正的 HTTP 204/205 空响应转换为成功结构；登录、健康检查和文件下载保留各自格式。其他 JSON API 缺少约定的 `code` 时视为响应格式错误。
- 失败始终抛出 `ApiError`，包括静默请求。页面必须捕获异步回调的失败，并在 `finally` 结束加载状态；不能靠拦截器吞掉异常后继续执行成功逻辑。
- `ApiError` 包含 `code`、`httpStatus`、`kind`、`errorCode`、`requestId`、`fields`、 `retryAfter`、`uncertain`，不保留请求体、令牌和完整 Axios 异常。
- 文件下载接口失败时解析 JSON Blob，正常附件原样返回。取消请求不提示错误。

## 提示归属

| `errorMode` | 使用位置 | 行为 |
| --- | --- | --- |
| `global`（默认） | 普通列表及操作 | 统一通知；三秒内相同错误合并，页面捕获后不重复提示 |
| `local` | 登录、资源详情、编辑器、上传 | 由页面展示 Alert 或操作提示；仍会处理身份失效 |
| `silent` | 自动轮询 | 无错误通知，Promise 仍拒绝；仍会处理身份失效 |

`skipErrorHandler: true` 仅兼容为 `local`，新增代码使用 `errorMode`。本地提示使用 `showRequestError(error)`；需要页面内文字时使用 `getRequestErrorMessage(error)`，返回空串表示已处理、静默或取消，不再追加兜底弹窗。禁止在 catch 中直接固定 `message.error('网络异常')`，这会掩盖校验和权限错误。

```ts
try {
  setLoading(true);
  const result = await request('/api/v1/example', { errorMode: 'local' });
  setData(result.data);
} catch (error) {
  setError(getRequestErrorMessage(error));
} finally {
  setLoading(false);
}
```

## 身份与重试

接口错误中，只有控制台受保护接口的实际 HTTP 401 触发退出；登录失败留在表单内，退出接口的失败交给退出流程处理。上游集群或仓库凭据失效使用 HTTP 502 / `UPSTREAM_AUTH_ERROR`，不会误清理控制台会话。旧请求迟到的 401 不得清理随后建立的新会话。路由守卫与接口 401 共用 `requireLogin`：同一轮登录跳转只提示一次，不受普通通知的三秒去重窗口影响；新会话开始发出受保护请求后，重置此状态。

请求自动携带 `X-Request-ID`。服务端错误的提示附请求编号，便于关联日志；续签同时支持 JSON 的 `new_access_token` 和响应头 `X-New-Access-Token`，仅接受当前会话请求的续签结果。

写操作遇到网络中断、超时或服务端错误，可能已被执行。界面提示先刷新核对，不自动重放请求。`Retry-After` 仅保存在异常中，不触发自动重试。

运行 `npm run test:request` 验证请求策略，`npx tsc --noEmit` 检查类型。
