import React from 'react';

const Brand: React.FC<{ collapsed?: boolean; light?: boolean }> = ({
  collapsed,
  light,
}) => (
  <span className={`ke-brand${light ? ' ke-brand-light' : ''}`}>
    <img
      src="/assets/kubeengine-mark.svg"
      width={36}
      height={36}
      alt={collapsed ? 'KubeEngine' : ''}
    />
    {!collapsed && (
      <span className="ke-brand-wordmark">
        Kube<span>Engine</span>
        <small>容器云管理平台</small>
      </span>
    )}
  </span>
);
export default Brand;
