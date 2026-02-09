import { Divider } from 'antd';
import Services from './Services';
import Ingresses from './Ingresses';

interface NetworkingProps {
  name: string;
}
const Networking: React.FC<NetworkingProps> = ({ name }) => {
  const namespace = 'apps';
  return (
    <>
      <Services name={name} namespace={namespace} />
      <Divider />
      <Ingresses name={name} namespace={namespace} />
    </>
  );
};

export default Networking;
