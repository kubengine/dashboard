import service from '@/services';
import { PageContainer } from '@ant-design/pro-components';
import { Col, Row } from 'antd';
import { useEffect, useState } from 'react';
import { DataPoint2, DataPoint3 } from '@/components/data';
import DataPoint from '@/components/DataPoint';
import Usage from '@/components/Usage';
import NodesTable from './node';
const { overview } = service.KubernetesController;
const Overview: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [cpuUsageRate, setCpuUsageRate] = useState<DataPoint2[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<DataPoint2[]>([]);
  const [nodesData, setNodesData] = useState<any[]>([]);
  const [cpuDataPoint, setCpuDataPoint] = useState<DataPoint3>();
  const [memoryDataPoint, setMemoryDataPoint] = useState<DataPoint3>();
  const [storageDataPoint, setStorageDataPoint] = useState<DataPoint3>();
  const [podsDataPoint, setPodsDataPoint] = useState<DataPoint3>();
  const fetchData = async () => {
    setLoading(true);
    setNodesData([]);
    const { data } = await overview();
    setCpuUsageRate(data['cpuUsageRate']);
    setMemoryUsage(data['memoryUsageRate']);
    setNodesData(data['nodes']);
    const totalCpuCapacity = data['totalCpuCapacity'];
    const totalCpuRequests = data['totalCpuRequests'];
    const totalMemoryCapacity = data['totalMemoryCapacity'];
    const totalMemoryRequests = data['totalMemoryRequests'];
    const totalPodCapacity = data['totalPodCapacity'];
    const totalAllocatedPods = data['totalAllocatedPods'];
    setCpuDataPoint({
      total: totalCpuCapacity / 1000,
      use: totalCpuRequests / 1000,
      name: 'CPU(Cores)',
    });
    setMemoryDataPoint({
      total: Number((totalMemoryCapacity / 1024 / 1024 / 1024).toFixed(2)),
      use: Number((totalMemoryRequests / 1024 / 1024 / 1024).toFixed(2)),
      name: '内存(Gi)',
    });
    setPodsDataPoint({
      total: totalPodCapacity,
      use: totalAllocatedPods,
      name: 'Pods',
    });
    const storage_capacity = data['storage_capacity'];
    setStorageDataPoint({
      total: storage_capacity['total'],
      use: Number(
        (storage_capacity['total'] - storage_capacity['available']).toFixed(1),
      ),
      name: '存储(Gi)',
    });
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PageContainer>
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <DataPoint dataSource={cpuDataPoint} loading={loading} />
        </Col>
        <Col span={6}>
          <DataPoint dataSource={memoryDataPoint} loading={loading} />
        </Col>
        <Col span={6}>
          <DataPoint dataSource={storageDataPoint} loading={loading} />
        </Col>
        <Col span={6}>
          <DataPoint dataSource={podsDataPoint} loading={loading} />
        </Col>
      </Row>
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <Usage
            loading={loading}
            dataSource={cpuUsageRate}
            title="CPU Usage"
            yTitle="CPU (cores)"
            unit="CPU"
          />
        </Col>
        <Col span={12}>
          <Usage
            loading={loading}
            dataSource={memoryUsage}
            title="Memory Usage"
            yTitle="Memory (bytes)"
            styleFill="l(270) 0:#ffffff 0.2:#7ec2f3 1:#1890ff"
            unit="Gi"
          />
        </Col>
      </Row>
      <NodesTable dataSource={nodesData} loading={loading} title="节点列表" />
    </PageContainer>
  );
};

export default Overview;
