import services from '@/services';
import { isSuccessCode, showRequestError } from '@/utils/request';
import { Divider } from 'antd';
import { useEffect, useState } from 'react';
import { Metadata } from './Metadata';
import { PodsStatus } from './PodsStatus';
import ResourcePods from './ResourcePods';
interface StatefulSetDetailProps {
  namespace: string;
  name: string;
}
const StatefulSetDetail: React.FC<StatefulSetDetailProps> = ({
  namespace,
  name,
}) => {
  const [resource, setResource] = useState<StatefulSetResource>();

  const get_resource = async () => {
    try {
      const { code, data } =
        await services.KubernetesController.resource_detail(
          'statefulset',
          namespace,
          name,
        );
      if (isSuccessCode(code)) {
        setResource(data);
      }
    } catch (error) {
      showRequestError(error);
    }
  };

  useEffect(() => {
    if (name && namespace) {
      get_resource();
    }
  }, [namespace, name]);

  return (
    <>
      <Metadata data={resource?.objectMeta} />
      <Divider />
      <PodsStatus data={resource?.podInfo || {}} />
      <Divider />
      <ResourcePods type="statefulset" namespace={namespace} name={name} />
    </>
  );
};

export default StatefulSetDetail;
