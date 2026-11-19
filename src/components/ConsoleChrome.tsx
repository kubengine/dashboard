import { getAuthStore } from '@/utils/auth';
import { usePermissions } from '@/utils/permissions';
import {
  AppstoreOutlined,
  DeploymentUnitOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Avatar, Breadcrumb, Dropdown, Empty, Input, Modal } from 'antd';
import React, { useState } from 'react';

const destinations = [
  { title: '资源总览', group: '工作空间', path: '/home' },
  { title: '用户与授权', group: '权限与审计', path: '/admin/users' },
  { title: '操作审计', group: '权限与审计', path: '/admin/audit' },
  { title: '我的账户', group: '工作空间', path: '/account' },
  { title: '资源中心', group: '工作空间', path: '/resources' },
  { title: '镜像仓库', group: '制品管理', path: '/artifacts/imagesRepo' },
  { title: '镜像导入', group: '制品管理', path: '/artifacts/imageImports' },
  { title: 'Helm 模板仓库', group: '制品管理', path: '/artifacts/chartsRepo' },
  { title: '应用库', group: '应用中心', path: '/apps/store' },
  { title: '应用配置', group: '应用中心', path: '/apps/config' },
  { title: '应用集群', group: '应用中心', path: '/apps/cluster' },
];

export const ConsoleHeader: React.FC<{
  onLogout: () => Promise<void>;
  onToggleMenu?: () => void;
}> = ({ onLogout, onToggleMenu }) => {
  const { pathname } = useLocation();
  const { admin } = usePermissions();
  const visibleDestinations = destinations.filter(
    (item) => admin || ['/resources', '/account'].includes(item.path),
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const active =
    visibleDestinations.find((item) => item.path === pathname) ||
    (/^\/resources\/[^/]+$/.test(pathname)
      ? visibleDestinations.find((item) => item.path === '/resources')
      : undefined);
  const group =
    active?.group ||
    (pathname.startsWith('/artifacts')
      ? '制品管理'
      : pathname === '/nodeDetail' || pathname.startsWith('/resources')
      ? '工作空间'
      : '应用中心');
  return (
    <>
      <a className="ke-skip-link" href="#ke-main">
        跳转到主要内容
      </a>
      <div className="ke-console-header">
        {onToggleMenu && (
          <button
            type="button"
            className="ke-menu-toggle"
            aria-label="打开导航菜单"
            onClick={onToggleMenu}
          >
            <MenuOutlined aria-hidden="true" />
          </button>
        )}
        <Breadcrumb
          items={[
            { title: <HomeOutlined aria-label="工作台" /> },
            { title: group },
            ...(active ? [{ title: active.title }] : [{ title: '资源详情' }]),
          ]}
        />
        <div className="ke-header-actions">
          <button
            type="button"
            className="ke-search-trigger"
            aria-label="搜索功能"
            onClick={() => {
              setQuery('');
              setOpen(true);
            }}
          >
            <SearchOutlined aria-hidden="true" /> <span>搜索功能</span>
          </button>
          <span className="ke-header-divider" />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'account',
                  label: '我的账户与密码',
                  onClick: () => history.push('/account'),
                },
                {
                  key: 'logout',
                  label: '退出登录',
                  icon: <LogoutOutlined aria-hidden="true" />,
                  onClick: () => void onLogout(),
                },
              ],
            }}
          >
            <button type="button" className="ke-account" aria-label="用户菜单">
              <Avatar size={30} icon={<UserOutlined aria-hidden="true" />} />{' '}
              <span>{getAuthStore().token?.username || '当前用户'}</span>
              <DownOutlined aria-hidden="true" />
            </button>
          </Dropdown>
        </div>
      </div>
      <Modal
        title="快速前往"
        open={open}
        footer={null}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Input
          autoFocus
          aria-label="搜索功能"
          prefix={<SearchOutlined aria-hidden="true" />}
          placeholder="输入页面名称，如应用库、镜像导入"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          allowClear
        />
        <nav className="ke-quick-results" aria-label="功能搜索结果">
          {visibleDestinations
            .filter((item) =>
              `${item.title}${item.group}`.includes(query.trim()),
            )
            .map((item) => (
              <button
                type="button"
                key={item.path}
                onClick={() => {
                  setOpen(false);
                  history.push(item.path);
                }}
              >
                <span>
                  {item.title}
                  <small>{item.group}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          {!visibleDestinations.some((item) =>
            `${item.title}${item.group}`.includes(query.trim()),
          ) && (
            <Empty
              description="没有匹配的功能"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </nav>
      </Modal>
    </>
  );
};

export const WorkspaceLabel: React.FC<{ collapsed?: boolean }> = ({
  collapsed,
}) =>
  collapsed ? null : (
    <div className="ke-workspace">
      <DeploymentUnitOutlined aria-hidden="true" />
      <span>
        默认工作空间<small>Kubernetes 资源管理</small>
      </span>
    </div>
  );
export const ConsoleFooter: React.FC<{ collapsed?: boolean }> = ({
  collapsed,
}) =>
  collapsed ? null : (
    <div className="ke-sider-footer">
      <AppstoreOutlined aria-hidden="true" />
      <span>
        KubeEngine 控制台<small>让基础设施，井然有序。</small>
      </span>
    </div>
  );
