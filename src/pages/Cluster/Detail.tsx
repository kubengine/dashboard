import services from '@/services';
import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';
import ConfigAndPVC from './components/ConfigAndPVC';
import Networking from './components/Networking';
import Workload from './components/Workload';

const ClusterDetail: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>('');

  const params = useParams<Record<string, any>>();
  const cluster_id = params.cluster_id;
  const getClusterInfo = async () => {
    setLoading(true);
    try {
      const {
        code,
        data,
        message: msg,
      } = await services.AppsController.get_cluster_by_id(cluster_id);
      if (code == 200) {
        setName(data.helm_name);
      } else {
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getClusterInfo();
  }, [cluster_id]);

  const [activeTabKey, setActiveTabKey] = useState('1');
  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  return (
    <PageContainer
      title={name ? `应用集群 · ${name}` : '应用集群详情'}
      subTitle="工作负载、网络与存储资源"
      loading={loading}
      header={{
        breadcrumb: {},
      }}
      tabActiveKey={activeTabKey}
      onTabChange={handleTabChange}
      tabList={[
        {
          tab: '工作负载',
          key: '1',
        },
        {
          tab: '服务',
          key: '2',
        },
        {
          tab: '配置和存储',
          key: '3',
        },
        // {
        //   tab: '其他',
        //   key: '4',
        // },
      ]}
    >
      <div>
        {activeTabKey === '1' && <Workload name={name} />}
        {activeTabKey === '2' && <Networking name={name} />}
        {activeTabKey === '3' && <ConfigAndPVC name={name} />}
        {/* {activeTabKey === '4' && <Other name={name} />} */}
      </div>
    </PageContainer>
  );
};

export default ClusterDetail;
