# 认证与后端安全修复适配

本次适配 `/opt/kubengine` 的 Bearer-only 鉴权、持久化登出和 WebSocket 会话复核。

- 退出登录先发送 `POST /api/v1/logout`，再清除本地会话。请求失败也清理本地状态，但明确提示服务端撤销未确认；不会误报令牌已失效。
- 移除旧 AK/SK 签名代码。自动清除旧 AK/SK、损坏存储及没有有效 `exp` 的令牌；旧 Token 存储中的残留 AK/SK 也会清除。
- `/pf/login` 保留为正常登录页的跳转入口，不再内置管理员密码或自动登录。正式 SSO 需另行实现可验证的后端协议。
- 登录和续签都根据新 JWT 的 `exp` 计算 UTC 过期时间，不复用旧时间或猜测有效期。客户端解析仅用于 UI，服务器继续验证签名、撤销记录和凭据版本。
- 续签只接受仍对应当前令牌的请求响应；登出期间和登出后的迟到响应不会恢复会话。旧会话的迟到 401 不清除新会话。
- WebSocket 在令牌变化时用新令牌重连；网络断开会释放旧引用并重试；1008 会话失效会结束本地登录；手动关闭及退出页面不自动重连。同浏览器跨标签页的存储变化也会关闭或更新连接。
- 清理 API 返回成功表示任务已接收，页面改为提示清理已提交；实际删除成功前不移除记录。

验证使用已有依赖，无需安装测试框架：

```bash
node scripts/check-auth-security.cjs
node_modules/.bin/max setup
node_modules/.bin/max build
node_modules/.bin/tsc --noEmit
```

脚本使用真实 TypeScript 模块、模拟浏览器存储/WebSocket/定时器验证故障路径，并通过 Umi 实际使用的 Axios 及本地适配器验证请求头兼容性、登出令牌和续签，不连接真实后端或集群。生产构建输出在 `dist/`；将完整构建目录发布到后端静态目录时，需清理旧版免密登录页面产物，避免保留曾写死凭据的旧文件。不要只覆盖 `umi.js`。

当前验证：18 项认证与 WebSocket 回归通过，生产构建通过。全工程 TypeScript 检查仍有 `FieldConfigGenerator.tsx` 的两项既有错误（引用不存在的 `AppConfigController` 导致规则参数类型缺失）；本轮修改文件没有新增类型错误。构建提示 Browserslist 数据较旧，本轮没有更新依赖或锁文件。
