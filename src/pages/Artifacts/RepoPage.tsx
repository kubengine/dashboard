import service from '@/services';
import { getBearerToken } from '@/utils/auth';
import {
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Divider,
  Empty,
  Input,
  message,
  Modal,
  PaginationProps,
  Popconfirm,
  Space,
  Spin,
  Table,
  Typography,
  Upload,
  UploadProps,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

const { Title, Text } = Typography;

/** 制品/仓库信息接口（对应 JSON 结构） */
interface ArtifactRepository {
  /** 制品数量 */
  artifact_count: number;
  /** 创建时间（UTC 时区 ISO 格式） */
  creation_time: string;
  /** 唯一 ID */
  id: number;
  /** 仓库名称（如：apps/redis-cluster） */
  name: string;
  /** 项目 ID */
  project_id: number;
  /** 拉取次数 */
  pull_count: number;
  /** 更新时间（UTC 时区 ISO 格式） */
  update_time: string;
}

// 定义常量枚举
export const enum RepoType {
  Chart = 'charts',
  Image = 'apps',
}

interface RepoProps {
  name: RepoType;
  /** 别名 */
  nameAlias: string;
}

export const RepoPage: React.FC<RepoProps> = ({
  name = '',
  nameAlias = '',
}) => {
  // 状态管理
  const [loading, setLoading] = useState<boolean>(true);
  const [artifactRepositoryData, setArtifactRepository] = useState<
    ArtifactRepository[]
  >([]);
  const [searchText, setSearchText] = useState<string>('');
  // 初始化分页状态
  const [paginationParams, setPaginationParams] = useState<{
    current: number; // 当前页码（AntD分页从1开始）
    pageSize: number; // 每页条数
  }>({
    current: 1,
    pageSize: 10, // 与你原有pageSize默认值一致
  });
  const [repo_count, setRepoCount] = useState<number>(0);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // 获取仓库列表数据
  const fetchRepos = async (current = 1, pageSize = 10) => {
    setLoading(true);
    const { code, data } = await service.ArtifactsController.get_repositories(
      name,
      searchText ? `name${encodeURIComponent('=')}~${searchText}` : '',
      pageSize,
      current,
    );
    if (code == 200) {
      setArtifactRepository(data);
      if (searchText) {
        setRepoCount(data.length);
      }
    } else {
      message.error('获取仓库列表失败');
    }
    setLoading(false);
  };

  const fetchProject = async () => {
    const { code, data } = await service.ArtifactsController.get_projects(name);
    if (code == 200) {
      setRepoCount(data.repo_count);
    } else {
      message.error(`获取${name}仓库失败`);
    }
  };

  // 初始加载和筛选条件变化时重新加载
  useEffect(() => {
    fetchRepos();
    fetchProject();
  }, [searchText]);

  // 处理删除仓库
  const handleDelete = async (p_name: string) => {
    const r_name = encodeURIComponent(
      encodeURIComponent(p_name.replace(new RegExp(`^${name}/`), '')),
    );
    const { code, message: msg } =
      await service.ArtifactsController.del_repositories(name, r_name);
    if (code == 200) {
      message.success('仓库删除成功');
      fetchRepos(); // 重新加载列表
    } else {
      message.error(msg);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '仓库名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: ArtifactRepository) => (
        <Button
          type="link"
          onClick={() => {
            const repository_name = encodeURIComponent(
              record.name.replace(new RegExp(`^${name}/`), ''),
            );
            history.push(`/artifacts/list/${name}/${repository_name}`);
          }}
        >
          {text.replace(new RegExp(`^${name}/`), '')}
        </Button>
      ),
    },
    {
      title: '制品数',
      dataIndex: 'artifact_count',
      key: 'artifact_count',
      width: 120,
    },
    {
      title: '下载数',
      dataIndex: 'pull_count',
      key: 'pull_count',
      width: 250,
    },
    {
      title: '最近变更时间',
      dataIndex: 'update_time',
      key: 'update_time',
      width: 120,
      render: (update_time: string) => {
        return dayjs(update_time).format('YYYY-MM-DD HH:mm');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: ArtifactRepository) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              const repository_name = encodeURIComponent(
                record.name.replace(new RegExp(`^${name}/`), ''),
              );
              history.push(`/artifacts/list/${name}/${repository_name}`);
            }}
          >
            查看制品
          </Button>
          <Popconfirm
            title="确定要删除这个仓库吗？"
            onConfirm={() => handleDelete(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  // 分页变化回调：获取并更新分页参数
  const handleTableChange: PaginationProps['onChange'] = (
    current: number, // 当前页码
    pageSize: number, // 每页条数
  ) => {
    // 更新分页状态（核心：获取最新分页参数）
    setPaginationParams({ current, pageSize });

    // 示例：调用接口获取对应页的数据
    fetchRepos(current, pageSize);
  };
  // 上传Helm Chart / 镜像
  const handleUpload: UploadProps['onChange'] = async (info) => {
    if (info.file.status === 'done') {
      message.success(`Chart ${info.file.name} 上传成功`);
      fetchRepos();
      // setUploadModalVisible(false);
    } else if (info.file.status === 'error') {
      message.error(info.file.response.message);
    }
  };

  return (
    <Card>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          {nameAlias}仓库管理
        </Title>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索仓库名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />

        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setUploadModalVisible(true)}
        >
          {name == RepoType.Chart ? '上传Chart' : '上传镜像'}
        </Button>
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={artifactRepositoryData}
          columns={columns}
          rowKey="id"
          pagination={{
            ...paginationParams, // 绑定受控的分页参数
            showSizeChanger: true,
            total: repo_count,
            onChange: handleTableChange, // 分页变化回调
          }}
          scroll={{ x: 1100 }}
          size="middle"
          locale={{
            emptyText: <Empty description="暂无仓库数据" />,
          }}
        />
      </Spin>

      {/* 上传Chart弹窗 */}
      <Modal
        title={name == RepoType.Chart ? '上传Helm Chart' : '上传镜像'}
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        destroyOnHidden={true}
      >
        <Upload
          name="file"
          action={
            name == RepoType.Chart
              ? '/api/v1/artifacts/upload/chart'
              : '/api/v1/artifacts/upload/image'
          }
          headers={{ Authorization: `${getBearerToken()}` }}
          onChange={handleUpload}
          accept={name == RepoType.Chart ? '.tgz,.tar.gz' : '.tar,tar.gz,.tgz'}
          // maxCount={10}
          multiple={true}
        >
          <Button icon={<UploadOutlined />}>
            {name == RepoType.Chart
              ? '选择Chart包(.tgz/.tar.gz)'
              : '选择镜像文件(.tar/.tar.gz/.tgz)'}
          </Button>
        </Upload>
        <Divider />
        <Text type="secondary">
          {name == RepoType.Chart
            ? '提示:仅支持标准Helm Chart包格式(.tgz/.tar.gz),请注意调整chart中镜像信息'
            : '提示：仅支持标准OCI标准镜像,文件名以tar结尾,且镜像name应为kubengine.io/apps/xxx'}
        </Text>
      </Modal>
    </Card>
  );
};
