import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
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

  return <PageContainer title={false}>{resource_map(type)}</PageContainer>;
};

export default ResourceInfo;
