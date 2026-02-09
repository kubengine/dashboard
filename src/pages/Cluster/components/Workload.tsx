import { Divider } from 'antd';
import DaemonSets from './DaemonSets';
import Deployments from './Deployments';
import StatefulSet from './StatefulSet';

interface WorkloadProps {
  name: string;
}

const Workload: React.FC<WorkloadProps> = ({ name }) => {
  const namespace = 'apps';
  return (
    <>
      <StatefulSet name={name} namespace={namespace} />
      <Divider />
      <DaemonSets name={name} namespace={namespace} />
      <Divider />
      <Deployments name={name} namespace={namespace} />
    </>
  );
};

export default Workload;
