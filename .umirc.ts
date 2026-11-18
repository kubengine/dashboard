import { defineConfig } from '@umijs/max';
import { consoleTheme } from './src/theme';

export default defineConfig({
  antd: { theme: consoleTheme },
  title: 'KubeEngine',
  favicons: ['/assets/kubeengine-mark.svg'],
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    locale: false,
  },
  routes: [
    {
      name: '登录',
      path: '/user/login',
      component: '@/pages/User/Login',
      layout: false,
    },
    {
      path: '/pf/login',
      redirect: '/user/login',
      layout: false,
    },
    { path: '/', redirect: '/home' },
    {
      name: '资源总览',
      icon: 'dashboard',
      path: '/home',
      component: '@/pages/Home',
    },
    {
      name: '节点信息',
      path: '/nodeDetail',
      component: '@/pages/Home/nodeDetail',
      hideInMenu: true,
    },
    {
      name: '制品管理',
      icon: 'project',
      path: '/artifacts',
      routes: [
        {
          name: '镜像仓库',
          path: '/artifacts/imagesRepo',
          component: '@/pages/Artifacts/ImagesRepo',
        },
        {
          name: '镜像导入',
          path: '/artifacts/imageImports',
          component: '@/pages/Artifacts/ImageImports',
        },
        {
          name: 'Helm 模板仓库',
          path: '/artifacts/chartsRepo',
          component: '@/pages/Artifacts/HelmChartsRepo',
        },
        {
          name: '制品列表',
          path: '/artifacts/list/:project_name/:repository_name',
          component: '@/pages/Artifacts/ArtifactsList',
          hideInMenu: true,
        },
        {
          name: '制品详情',
          path: '/artifacts/detail/:project_name/:repository_name/:digest',
          component: '@/pages/Artifacts/ArtifactDetail',
          hideInMenu: true,
        },
      ],
    },
    {
      name: '应用中心',
      icon: 'appstore',
      path: '/apps',
      routes: [
        {
          name: '应用库',
          path: '/apps/store',
          component: '@/pages/Apps/Store',
        },
        {
          name: '应用部署',
          path: '/apps/deploy/:app_id',
          component: '@/pages/Apps/Deploy',
          hideInMenu: true,
        },
        {
          name: '应用配置',
          path: '/apps/config',
          component: '@/pages/Apps/Config',
        },
        {
          name: '应用注册',
          path: '/apps/editor',
          component: '@/pages/Apps/Editor',
          hideInMenu: true,
        },
        {
          name: '应用修改',
          path: '/apps/editor/:app_id',
          component: '@/pages/Apps/Editor',
          hideInMenu: true,
        },
        {
          name: '应用集群',
          path: '/apps/cluster',
          component: '@/pages/Cluster/List',
        },
        {
          name: '集群详情',
          path: '/apps/cluster/detail/:cluster_id',
          component: '@/pages/Cluster/Detail',
          hideInMenu: true,
        },
        {
          path: '/apps/info/:type/:namespace/:name',
          component: '@/pages/Cluster/ResourceInfo',
          hideInMenu: true,
        },
      ],
    },
    // { name: "ws测试", path: '/wstest', component: '@/pages/WsDemo' },
    { path: '*', layout: false, component: './404' },
  ],
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      target: process.env.KUBENGINE_API_TARGET || 'http://172.31.57.23:8080/',
      changeOrigin: true,
      ws: true,
      // 'pathRewrite': { '^/api' : '' },
    },
  },
  mfsu: true,
  dva: {},
});
