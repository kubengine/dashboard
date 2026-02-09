# KubeEngine Dashboard

<div align="center">

### KubeEngine 容器云管理平台前端

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![Umi](https://img.shields.io/badge/Umi_Max-4.6+-000000.svg)](https://umijs.org/)
[![Ant Design](https://img.shields.io/badge/Ant_Design-5.4+-1890FF.svg)](https://ant.design/)

</div>

---

**KubeEngine Dashboard** 是 KubeEngine 容器云平台的现代化前端管理界面，基于 React + Umi Max + Ant Design 构建，为用户提供直观、高效的集群与应用管理体验。

## 目录

- [简介](#-简介)
- [核心特性](#-核心特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [功能模块](#-功能模块)
- [开发指南](#-开发指南)
- [构建部署](#-构建部署)
- [配置说明](#-配置说明)

## 📖 简介

KubeEngine Dashboard 作为 KubeEngine 平台的 Web 前端，提供了完整的容器云管理功能，包括集群监控、应用部署、镜像仓库管理等。通过与后端 RESTful API 的无缝对接，实现了实时数据展示和操作反馈。

## ✨ 核心特性

### 🔐 双重认证机制
- **Token 认证**：基于 JWT 的用户名密码登录
- **AKSK 认证**：基于 Access Key/Secret Key 的 API 访问
- **自动续期**：Token 即将过期时自动更新
- **安全拦截**：全局路由守卫，未登录自动跳转

### 📊 实时数据展示
- **WebSocket 集成**：实时日志流与任务状态更新
- **响应式布局**：适配各种屏幕尺寸
- **数据可视化**：基于 Ant Design Charts 的图表展示

### 🎨 现代化 UI
- **Ant Design Pro 组件**：开箱即用的企业级组件
- **主题定制**：支持亮色/暗色主题切换
- **国际化支持**：内置中英文语言包

### 🚀 高性能体验
- **按需加载**：路由级别的代码分割
- **缓存优化**：静态资源缓存策略
- **构建优化**：生产环境自动压缩与优化

## 🛠️ 技术栈

### 核心框架
- **React 18**：用户界面库
- **Umi Max 4**：企业级前端应用框架
- **TypeScript 5**：类型安全的 JavaScript 超集
- **Ant Design 5**：企业级 UI 设计语言

### 状态管理
- **Umi Model**：内置的状态管理方案

### 网络请求
- **Umi Request**：基于 fetch 封装的请求库
- **WebSocket API**：实时通信支持

### 工具库
- **@ant-design/icons**：Ant Design 官方图标库
- **@ant-design/pro-components**：高级业务组件
- **@ant-design/plots**：可视化图表组件
- **antd-style**：CSS-in-JS 样式方案
- **crypto-js**：加密与签名
- **react-syntax-highlighter**：代码高亮
- **yaml**：YAML 解析与序列化

### 开发工具
- **Prettier**：代码格式化
- **Husky**：Git hooks 管理
- **lint-staged**：暂存文件检查

## 🚀 快速开始

### 环境要求

- **Node.js**：16.x 或更高版本
- **pnpm**：7.x 或更高版本（推荐）

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 或使用 npm
npm run dev
```

访问 `http://localhost:8000` 即可查看应用。

### 常用命令

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码格式化
pnpm format

# 初始化项目
pnpm setup
```

## 📁 项目结构

```
dashboard/
├── public/                 # 静态资源目录
│   ├── assets/            # 图片、字体等资源
│   ├── app_logo/          # 应用 Logo
│   └── config/            # 配置文件
├── src/
│   ├── .umi/              # Umi 框架生成文件（勿修改）
│   ├── app.ts             # 应用入口配置
│   ├── global.less        # 全局样式
│   ├── components/        # 公共组件
│   ├── constants/         # 常量定义
│   ├── layouts/           # 布局组件
│   ├── models/            # 数据模型
│   ├── pages/             # 页面组件
│   │   ├── 404.tsx        # 404 页面
│   │   ├── Apps/          # 应用管理
│   │   ├── Artifacts/     # 制品管理
│   │   ├── Cluster/       # 集群管理
│   │   ├── Home/          # 首页
│   │   ├── User/          # 用户管理
│   │   └── WsDemo.tsx     # WebSocket 演示
│   ├── services/          # API 服务
│   │   ├── AppController.ts
│   │   ├── ArtifactsController.ts
│   │   ├── KubernetesController.ts
│   │   ├── UserController.ts
│   │   └── index.ts
│   └── utils/             # 工具函数
│       ├── auth.ts        # 认证工具（Token/AKSK）
│       ├── aksk.ts        # AKSK 签名
│       └── ...
├── dist/                  # 构建输出目录
├── mock/                  # Mock 数据
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
└── README.md              # 项目文档
```

## 📱 功能模块

### 用户管理 (`/user`)
- 用户登录（Token / AKSK 两种认证方式）
- 登录状态维护与自动续期
- 安全登出

### 首页 (`/`)
- 平台概览
- 快速入口

### 集群管理 (`/cluster`)
- 集群列表展示
- 集群详情查看
- 节点资源监控
- 集群配置管理

### 应用管理 (`/apps`)
- 应用列表
- 应用部署配置
- 应用配置编辑器
- 字段配置生成器
- 应用商店

### 制品管理 (`/artifacts`)
- 镜像制品管理
- 构建任务查看

### WebSocket 实时通信
- 实时日志流
- 任务状态更新
- 连接状态监控

## 👨‍💻 开发指南

### 开发环境配置

1. **克隆项目**
```bash
git clone https://github.com/your-org/dashboard.git
cd dashboard
```

2. **安装依赖**
```bash
pnpm install
```

3. **启动开发服务器**
```bash
pnpm dev
```

### 代码规范

项目使用 **Prettier** 进行代码格式化，提交前会自动格式化：

```bash
# 手动格式化
pnpm format
```

### 添加新页面

```bash
# 使用 Umi 脚手架生成页面
pnpm g page

# 或手动创建
# 1. 在 src/pages/ 下创建页面组件
# 2. 在路由配置中注册（Umi 会自动识别约定式路由）
```

### API 服务开发

在 `src/services/` 目录下创建对应的 Controller 文件：

```typescript
// src/services/ExampleController.ts
import { request } from '@umijs/max';

export async function getExampleList() {
  return request('/api/v1/examples', {
    method: 'GET',
  });
}

export async function createExample(data: any) {
  return request('/api/v1/examples', {
    method: 'POST',
    data,
  });
}
```

### 认证机制

#### Token 认证
```typescript
import { getBearerToken } from '@/utils/auth';

// 请求会自动携带 Authorization Header
// Authorization: Bearer <token>
```

#### AKSK 认证
```typescript
import { getAKSK } from '@/utils/auth';

// 请求会自动携带签名相关 Headers
// ak: <AccessKey>
// timestamp: <Signature>
// nonce: <RandomString>
// signature: <CalculatedSignature>
```

## 🏗️ 构建部署

### 构建生产版本

```bash
pnpm build
```

构建产物将输出到 `dist/` 目录。

### 部署方式

#### 方式一：静态文件部署

将 `dist/` 目录的内容部署到 Nginx/Apache 等静态服务器：

```nginx
server {
    listen 80;
    server_name dashboard.kubengine.io;
    root /var/www/dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
    }
}
```

#### 方式二：Docker 部署

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
# 构建镜像
docker build -t kubengine-dashboard .

# 运行容器
docker run -d -p 80:80 kubengine-dashboard
```

## ⚙️ 配置说明

### 环境变量

在 `.env` 文件中配置环境变量：

```bash
# API 基础地址
UMI_ENV=dev

# 后端 API 地址
BASE_API_URL=https://api.kubengine.io
```

### 代理配置

在 `config/proxy.ts` 中配置开发环境代理：

```typescript
export default {
  dev: {
    '/api': {
      target: 'https://api.kubengine.io',
      changeOrigin: true,
      secure: false,
    },
  },
};
```

### 路由配置

Umi Max 支持约定式路由和配置式路由，本项目使用约定式路由：

```
pages/
├── User/
│   └── login.tsx       → /user/login
├── Cluster/
│   ├── List.tsx        → /cluster/list
│   └── Detail.tsx      → /cluster/detail
└── Apps/
    └── Editor.tsx      → /apps/editor
```

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 🤝 贡献

欢迎贡献代码！请遵循以下流程：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📮 联系方式

- **作者**：duanzt
- **邮箱**：duanzt@avic.com
- **相关项目**：[KubeEngine 后端](https://github.com/kubengine/kubengine)
