import services from '@/services';
import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';
import ConfigAndPVC from './components/ConfigAndPVC';
import Networking from './components/Networking';
import Other from './components/Other';
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
      // fixedHeader
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
        {
          tab: '其他',
          key: '4',
        },
      ]}
    >
      <div
        style={{
          // 核心：开启垂直滚动
          overflowY: 'auto',
          // 关键：设置高度约束（两种方案可选）
          // 方案 A：固定最大高度（适合普通场景）
          maxHeight: 'calc(100vh - 200px)', // 100vh 视口高度 - 页头/标签栏高度（按需调整）
          // 方案 B：全屏剩余高度（适合需要占满视口的场景）
          // height: 'calc(100vh - 200px)',
          // 可选：优化滚动体验
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        {activeTabKey === '1' && <Workload name={name} />}
        {activeTabKey === '2' && <Networking name={name} />}
        {activeTabKey === '3' && <ConfigAndPVC name={name} />}
        {activeTabKey === '4' && <Other name={name} />}
      </div>
    </PageContainer>
  );
};

export default ClusterDetail;
