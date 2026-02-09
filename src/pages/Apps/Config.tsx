import services from '@/services';
import { App } from '@/services/AppController';
import { getRelativeTime } from '@/utils/time';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  Drawer,
  Empty,
  Input,
  message,
  PaginationProps,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';
import { AppConfigForm } from './components/AppConfigForm';

const Config: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<App[]>();
  const [searchText, setSearchText] = useState<string>('');
  const [paginationParams, setPaginationParams] = useState<{
    current: number; // 当前页码（AntD分页从1开始）
    pageSize: number; // 每页条数
  }>({
    current: 1,
    pageSize: 10, // 与你原有pageSize默认值一致
  });
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [showApp, setShowApp] = useState<App>({
    name: '',
    category: [],
    helm_chart: '',
    description: '',
    app_field_configs: [],
  });

  const removeApp = async (app_id: number) => {
    setLoading(true);
    const { code } = await services.AppsController.del(app_id);
    if (code == 200) {
      message.success('应用删除成功');
      getConfig();
    } else {
      message.error('应用删除失败');
    }
    setLoading(false);
  };
  const columns = [
    {
      title: '应用ID',
      dataIndex: 'app_id',
      key: 'app_id',
      width: 100,
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '应用描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
    },
    {
      title: '应用分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string[]) => (
        <>
          {category.map((item) => (
            <Tag color={'cyan'}>{item}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Helm模板',
      dataIndex: 'helm_chart',
      key: 'helm_chart',
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
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: App, index: number) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setShowApp(record);
              setOpen(true);
            }}
          >
            预览
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => history.push(`/apps/editor/${record.app_id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个应用吗？"
            onConfirm={() => {
              if (record.app_id != undefined) {
                removeApp(record.app_id);
              }
            }}
            okText="是"
            cancelText="否"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const getConfig = async () => {
    setLoading(true);
    const { code, data } = await services.AppsController.list(
      searchText,
      paginationParams.pageSize,
      paginationParams.current,
    );
    if (code == 200) {
      setData(data.data);
      setCount(data.total);
    } else {
      message.error('获取应用配置列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    getConfig();
  }, [searchText, paginationParams]);

  // 分页变化回调：获取并更新分页参数
  const handleTableChange: PaginationProps['onChange'] = (
    current: number, // 当前页码
    pageSize: number, // 每页条数
  ) => {
    // 更新分页状态（核心：获取最新分页参数）
    setPaginationParams({ current, pageSize });
  };

  return (
    <PageContainer title="应用配置">
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索应用名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />

        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => history.push('/apps/editor')}
        >
          注册应用
        </Button>
      </div>
      <Spin spinning={loading}>
        <Table
          dataSource={data}
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
            emptyText: <Empty description="暂无应用" />,
          }}
        />
      </Spin>
      <Drawer
        size="large"
        placement="right"
        mask={true}
        closable={false}
        onClose={() => setOpen(false)}
        open={open}
      >
        <AppConfigForm app={showApp} />
      </Drawer>
    </PageContainer>
  );
};

export default Config;
