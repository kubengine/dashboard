import type {
  DataPoint2,
  DataPoint3,
  KubernetesNodeData,
} from '@/components/data';
import DataPoint from '@/components/DataPoint';
import PageHeading from '@/components/PageHeading';
import Usage from '@/components/Usage';
import service from '@/services';
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link } from '@umijs/max';
import { Alert, Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import NodesTable from './node';

const Overview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updated, setUpdated] = useState('');
  const [cpuUsageRate, setCpuUsageRate] = useState<DataPoint2[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<DataPoint2[]>([]);
  const [nodes, setNodes] = useState<KubernetesNodeData[]>([]);
  const [metrics, setMetrics] = useState<DataPoint3[]>([]);
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { code, data } = await service.KubernetesController.overview();
      if (code != 200 || !data) throw new Error('无法获取资源数据');
      setCpuUsageRate(data.cpuUsageRate || []);
      setMemoryUsage(data.memoryUsageRate || []);
      setNodes(data.nodes || []);
      const gi = (value: number) => Number((value / 1024 ** 3).toFixed(2));
      setMetrics([
        {
          name: 'CPU 已请求',
          total: data.totalCpuCapacity / 1000,
          use: data.totalCpuRequests / 1000,
        },
        {
          name: '内存已请求',
          total: gi(data.totalMemoryCapacity),
          use: gi(data.totalMemoryRequests),
        },
        {
          name: '存储已使用',
          total: data.storage_capacity?.total || 0,
          use: Number(
            (
              (data.storage_capacity?.total || 0) -
              (data.storage_capacity?.available || 0)
            ).toFixed(1),
          ),
        },
        {
          name: 'Pod 已分配',
          total: data.totalPodCapacity,
          use: data.totalAllocatedPods,
        },
      ]);
      setUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  const readyCount = nodes.filter((node) => node.ready).length;
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE / OVERVIEW"
        title="资源总览"
        description="掌握基础设施运行状态，让资源调度更有据可依。"
        extra={
          <>
            <span className="ke-section-caption" role="status">
              {updated
                ? `更新于 ${updated}`
                : error
                ? '数据未加载'
                : '正在获取数据'}
            </span>
            <Button
              icon={<ReloadOutlined aria-hidden="true" />}
              loading={loading}
              onClick={() => void fetchData()}
            >
              刷新
            </Button>
          </>
        }
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message="资源数据加载失败"
          description="请检查网络连接后刷新重试。已有数据保留供参考。"
          action={
            <Button
              size="small"
              onClick={() => void fetchData()}
              loading={loading}
            >
              重试
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      )}
      <div className="ke-hero-note">
        {!updated && !error ? (
          <ReloadOutlined aria-hidden="true" />
        ) : readyCount === nodes.length && nodes.length > 0 ? (
          <CheckCircleOutlined aria-hidden="true" />
        ) : (
          <WarningOutlined aria-hidden="true" />
        )}
        <span>
          {!updated
            ? error
              ? '暂时无法读取集群状态，请刷新重试。'
              : '正在连接集群，读取资源状态…'
            : nodes.length
            ? `当前 ${nodes.length} 个节点中，${readyCount} 个已就绪${
                error ? '（上次成功获取的数据）' : ''
              }。资源请求量与实际使用趋势分别展示。`
            : '当前没有可展示的节点。'}
        </span>
        <Link to="/apps/store">
          前往应用库 <ArrowRightOutlined aria-hidden="true" />
        </Link>
      </div>
      <div className="ke-overview-grid">
        {['核', 'GiB', 'GiB', '个'].map((unit, index) => (
          <DataPoint
            key={unit + index}
            dataSource={metrics[index]}
            loading={loading}
            unit={unit}
            kind={index}
          />
        ))}
      </div>
      <div className="ke-chart-grid">
        <Usage
          loading={loading}
          dataSource={cpuUsageRate}
          title="CPU 使用趋势"
          yTitle="核"
          unit="核"
        />
        <Usage
          loading={loading}
          dataSource={memoryUsage}
          title="内存使用趋势"
          yTitle="GiB"
          unit="GiB"
          styleFill="#14a89a"
        />
      </div>
      <NodesTable dataSource={nodes} loading={loading} title="节点资源" />
      <div
        style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}
        className="ke-section-caption"
      >
        <AppstoreOutlined aria-hidden="true" />
        <span>从资源到应用，让交付更进一步。</span>
        <Link to="/apps/cluster">
          查看应用集群 <ArrowRightOutlined aria-hidden="true" />
        </Link>
      </div>
    </>
  );
};
export default Overview;
