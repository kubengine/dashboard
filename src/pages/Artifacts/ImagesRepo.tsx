import { RepoPage, RepoType } from './RepoPage';

const ImagesRepo: React.FC = () => {
  return <RepoPage name={RepoType.Image} nameAlias="镜像" />;
};

export default ImagesRepo;
