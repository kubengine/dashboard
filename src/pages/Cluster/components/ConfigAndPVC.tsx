import { Divider } from 'antd';
import ConfigMaps from './ConfigMaps';
import PVCs from './PVCs';

interface ConfigAndPVCProps {
  name: string;
}
const ConfigAndPVC: React.FC<ConfigAndPVCProps> = ({ name }) => {
  const namespace = 'apps';
  return (
    <>
      <ConfigMaps name={name} namespace={namespace} />
      <Divider />
      <PVCs name={name} namespace={namespace} />
    </>
  );
};

export default ConfigAndPVC;
