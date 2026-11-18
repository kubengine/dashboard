import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Button, Space } from 'antd';
import React from 'react';
import NoFoundPage from '../404';
import ConfigMapDetail from './components/ConfigMapDetail';
import DaemonSetDetail from './components/DaemonSetDetail';
import DeploymentDetail from './components/DeploymentDetail';
import IngressDetail from './components/IngressDetail';
import PodDetail from './components/PodDetail';
import PVCDetail from './components/PVCDetail';
import PVDetail from './components/PVDetail';
import ReplicasetDetail from './components/ReplicasetDetail';
import SecretDetail from './components/SecretDetail';
import ServiceDetail from './components/ServiceDetail';
import StatefulSetDetail from './components/StatefulSetDetail';

const ResourceInfo: React.FC = () => {
  const params = useParams<Record<string, any>>();
  const type = params.type;
  const namespace = params.namespace;
  const name = params.name;

  const resource_map = (type: string) => {
    switch (type) {
      case 'service':
        return <ServiceDetail name={name} namespace={namespace} />;
      case 'statefulset':
        return <StatefulSetDetail name={name} namespace={namespace} />;
      case 'configmap':
        return <ConfigMapDetail name={name} namespace={namespace} />;
      case 'pvc':
        return <PVCDetail name={name} namespace={namespace} />;
      case 'pv':
        return <PVDetail name={name} namespace={namespace} />;
      case 'daemonset':
        return <DaemonSetDetail name={name} namespace={namespace} />;
      case 'deployment':
        return <DeploymentDetail name={name} namespace={namespace} />;
      case 'replicaset':
        return <ReplicasetDetail name={name} namespace={namespace} />;
      case 'ingress':
        return <IngressDetail name={name} namespace={namespace} />;
      case 'secret':
        return <SecretDetail name={name} namespace={namespace} />;
      case 'pod':
        return <PodDetail name={name} namespace={namespace} />;
      default:
        return <NoFoundPage />;
    }
  };

  const canonical =
    type === 'pvc'
      ? 'persistentvolumeclaim'
      : type === 'pv'
      ? 'persistentvolume'
      : type;
  const inspectPath = `/resources/${canonical}/${encodeURIComponent(
    namespace,
  )}/${encodeURIComponent(name)}`;
  return (
    <PageContainer title={false}>
      <Space wrap style={{ marginBottom: 20 }}>
        <Link to={inspectPath}>
          <Button>资源中心查看</Button>
        </Link>
        <Link to={`${inspectPath}?tab=events`}>
          <Button>查看事件</Button>
        </Link>
        <Link to={`${inspectPath}?tab=yaml`}>
          <Button>查看 YAML</Button>
        </Link>
        {type === 'pod' && (
          <>
            <Link to={`${inspectPath}?tab=logs`}>
              <Button>容器日志</Button>
            </Link>
            <Link to={`${inspectPath}?tab=terminal`}>
              <Button>终端</Button>
            </Link>
            <Link to={`${inspectPath}?tab=files`}>
              <Button>文件管理</Button>
            </Link>
          </>
        )}
      </Space>
      {resource_map(type)}
    </PageContainer>
  );
};

export default ResourceInfo;
