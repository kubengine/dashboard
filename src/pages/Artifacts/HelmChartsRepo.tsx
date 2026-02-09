import { RepoPage, RepoType } from './RepoPage';

const HelmChartsRepo: React.FC = () => {
  return <RepoPage name={RepoType.Chart} nameAlias="Helm模板" />;
};

export default HelmChartsRepo;
