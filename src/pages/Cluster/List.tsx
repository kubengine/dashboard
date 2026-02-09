import YamlDisplay from '@/components/YamlDisplay';
import services from '@/services';
import { getRelativeTime } from '@/utils/time';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useModel } from '@umijs/max';
import {
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  PaginationProps,
  Popconfirm,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { stringify } from 'yaml';

const { Text } = Typography;

const StatusLabel: React.FC<{ status: string }> = ({ status }) => {
  // 映射状态到样式类
  const getColorAndText = (): { colorClass: string; text: string } => {
    switch (status) {
      case 'pending':
        return {
          colorClass: 'status-dot dot-success blink-animation',
          text: '待创建',
        };
      case 'creating':
        return {
          colorClass: 'status-dot dot-success blink-animation',
          text: '创建中',
        };
      case 'checking':
        return {
          colorClass: 'status-dot dot-warning blink-animation',
          text: '状态检查中',
        };
      case 'cleaning':
        return {
          colorClass: 'status-dot dot-warning blink-animation',
          text: '资源清理中',
        };
      case 'healthy':
        return {
          colorClass: 'status-dot dot-success',
          text: '健康',
        };
      case 'unhealthy':
        return {
          colorClass: 'status-dot dot-warning',
          text: '不健康',
        };
      case 'anomaly':
        return {
          colorClass: 'status-dot dot-error',
          text: '异常',
        };
      default:
        return {
          colorClass: 'status-dot dot-default',
          text: '未知',
        };
    }
  };
  const data = getColorAndText();
  return (
    <Text>
      <span className={data.colorClass} />
      {data.text}
    </Text>
  );
};

/**
 * 应用集群的主接口
 */
interface Cluster {
  /** 集群ID */
  cluster_id: number;
  /** 集群名称 */
  name: string;
  /** helm chart模板名称 */
  helm_chart: string;
  /** helm chart模板版本 */
  helm_chart_version: string;
  /** 集群配置项 */
  config: { [key: string]: any };
  /** helm values数据 */
  helm_config: { [key: string]: any };
  /** helm install name */
  helm_name: string;
  /** 集群状态 */
  status: string;
  /** 创建时间（ISO 8601格式的时间字符串） */
  create_time: string;
  /** 最后一次修改时间（ISO 8601格式的时间字符串） */
  updated_time: string;
}

const Cluster: React.FC = () => {
  // 消费 WebSocket Model
  const { messages, connect, clearMessages, close } = useModel('websocket');
  const [searchText, setSearchText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [editData, setEditData] = useState<Cluster>();
  const [form] = Form.useForm();
  const [paginationParams, setPaginationParams] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });
  const [count, setCount] = useState<number>(0);
  // 分页变化回调：获取并更新分页参数
  const handleTableChange: PaginationProps['onChange'] = (
    current: number, // 当前页码
    pageSize: number, // 每页条数
  ) => {
    // 更新分页状态（核心：获取最新分页参数）
    setPaginationParams({ current, pageSize });
  };
  const removeCluster = async (cluster_id: number) => {
    setLoading(true);
    await services.AppsController.del_cluster(cluster_id);
    setLoading(false);
  };
  const columns = [
    {
      title: '集群ID',
      dataIndex: 'cluster_id',
      key: 'cluster_id',
      width: 100,
      render: (cluster_id: number, record: Cluster) =>
        record.status != 'healthy' ? (
          <span>{cluster_id}</span>
        ) : (
          <Link to={`/apps/cluster/detail/${cluster_id}`}>{cluster_id}</Link>
        ),
    },
    {
      title: '集群名称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: 'helm chart模板名称',
      dataIndex: 'helm_chart',
      key: 'helm_chart',
      width: 100,
    },
    {
      title: 'helm chart模板版本',
      dataIndex: 'helm_chart_version',
      key: 'helm_chart_version',
      width: 100,
    },
    {
      title: '创建于',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 100,
      render: (create_time: string) => getRelativeTime(create_time),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <StatusLabel status={status} />,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Cluster) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: `${record.name} Helm Values`,
                width: 700,
                content: (
                  <YamlDisplay
                    yamlText={stringify(record.helm_config)}
                    title="values.yaml"
                  />
                ),
              });
            }}
          >
            Helm Values
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditData(record);
              setVisible(true);
            }}
            disabled={
              record.status != 'healthy' &&
              record.status != 'unhealthy' &&
              record.status != 'anomaly'
            }
          >
            修改名称
          </Button>
          <Popconfirm
            title="确定要删除这个集群吗？"
            onConfirm={() => {
              removeCluster(record.cluster_id);
            }}
            okText="是"
            cancelText="否"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={
                record.status != 'healthy' &&
                record.status != 'unhealthy' &&
                record.status != 'anomaly'
              }
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const handleModalSubmit = async () => {
    // 1. 表单校验
    const values = await form.validateFields();
    const newName = values.name.trim();
    setModalLoading(true);
    const { code } = await services.AppsController.update_cluster(
      editData?.cluster_id || 0,
      newName,
    );

    // 4. 处理接口响应
    if (code === 200) {
      message.success('修改成功');
      getCluster();
      setVisible(false);
    }
    setModalLoading(false);
  };
  const getCluster = async () => {
    setLoading(true);
    const { code, data } = await services.AppsController.cluster_list(
      searchText,
      paginationParams.pageSize,
      paginationParams.current,
    );
    if (code == 200) {
      setClusters(data.data);
      setCount(data.total);
    } else {
      message.error('获取应用配置列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (messages.length > 0) {
      messages.map(({ type, data }) => {
        if (type == 'receive') {
          if (data.action == 'update_cluster') {
            const newClusters = [...(clusters || [])];
            const targetIndex = clusters.findIndex(
              (item) => item.cluster_id == data.data.cluster_id,
            );
            if (targetIndex !== -1) {
              newClusters[targetIndex] = data.data;
            }
            setClusters(newClusters);
          } else if (data.action == 'refresh_clusters') {
            getCluster();
          }
        }
      });
      clearMessages();
    }
  }, [messages]);

  useEffect(() => {
    connect();
  }, []);

  // 组件卸载时清理资源（避免内存泄漏）
  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  useEffect(() => {
    getCluster();
  }, [searchText, paginationParams]);

  return (
    <PageContainer>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索集群名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      <Spin spinning={loading}>
        <Table<Cluster>
          dataSource={clusters}
          columns={columns}
          rowKey="id"
          pagination={{
            ...paginationParams, // 绑定受控的分页参数
            showSizeChanger: true,
            total: count,
            onChange: handleTableChange, // 分页变化回调
          }}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: <Empty description="暂无集群" />,
          }}
        />
      </Spin>

      <Modal
        title="修改集群名称"
        open={visible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setVisible(false);
          setModalLoading(false);
        }}
        afterClose={() => {
          form.resetFields();
        }}
        confirmLoading={modalLoading}
        destroyOnHidden={true}
        maskClosable={false}
        width={400}
      >
        <Form
          form={form}
          layout="horizontal"
          initialValues={{ name: '' }} // 表单初始值
        >
          <Form.Item
            name="name"
            label="新的集群名"
            rules={[{ required: true, message: '请输入新的集群名' }]}
          >
            <Input placeholder="请输入新的集群名" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};
export default Cluster;
