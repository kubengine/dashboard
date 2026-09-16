import service from '@/services';
import type {
  ImageImportItem,
  ImageImportTask,
} from '@/services/ArtifactsController';
import {
  CloudUploadOutlined,
  EyeOutlined,
  ReloadOutlined,
  RetweetOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  message,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const { Dragger } = Upload;
const { Paragraph, Text, Title } = Typography;

const statusMeta: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待处理' },
  processing: { color: 'processing', label: '处理中' },
  success: { color: 'success', label: '全部成功' },
  partial_success: { color: 'warning', label: '部分成功' },
  failed: { color: 'error', label: '失败' },
};

const stageLabels: Record<string, string> = {
  pending: '等待处理',
  retry: '等待重试',
  validate: '校验镜像包',
  import: '导入文件',
  create_project: '创建 Harbor 项目',
  proxy: '配置透明代理',
  push: '推送镜像',
  completed: '已完成',
  system: '系统处理',
};

const formatBytes = (size: number) => {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );
  return `${(size / 1024 ** index).toFixed(index > 1 ? 2 : 0)} ${units[index]}`;
};

const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  const meta = statusMeta[status] || { color: 'default', label: status };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const ImageImports: React.FC = () => {
  const [tasks, setTasks] = useState<ImageImportTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ImageImportTask>();
  const [retrying, setRetrying] = useState(false);

  const fetchTasks = useCallback(
    async (current = pagination.current, pageSize = pagination.pageSize) => {
      try {
        const {
          code,
          data,
          message: msg,
        } = await service.ArtifactsController.get_image_import_tasks(
          pageSize,
          current,
        );
        if (code === 200 && data) {
          setTasks(data.data || []);
          setPagination((value) => ({
            ...value,
            current: data.page,
            pageSize: data.page_size,
            total: data.total,
          }));
        } else {
          message.error(msg || '获取镜像导入任务失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize],
  );

  const fetchDetail = useCallback(async (taskId: number, silent = false) => {
    if (!silent) setDetailLoading(true);
    try {
      const {
        code,
        data,
        message: msg,
      } = await service.ArtifactsController.get_image_import_task(taskId);
      if (code === 200 && data) {
        setSelectedTask(data);
      } else if (!silent) {
        message.error(msg || '获取导入详情失败');
      }
    } finally {
      if (!silent) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1') {
      setUploadOpen(true);
      window.history.replaceState(null, '', '/artifacts/imageImports');
    }
  }, []);

  const hasRunningTask = useMemo(
    () => tasks.some((task) => ['pending', 'processing'].includes(task.status)),
    [tasks],
  );
  const selectedTaskIsRunning = Boolean(
    selectedTask && ['pending', 'processing'].includes(selectedTask.status),
  );

  useEffect(() => {
    if (!hasRunningTask && !selectedTaskIsRunning) return;
    const timer = window.setInterval(() => {
      void fetchTasks();
      if (selectedTask && selectedTaskIsRunning) {
        void fetchDetail(selectedTask.task_id, true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [
    fetchDetail,
    fetchTasks,
    hasRunningTask,
    selectedTask,
    selectedTaskIsRunning,
  ]);

  const openDetail = async (task: ImageImportTask) => {
    setSelectedTask(task);
    setDetailOpen(true);
    await fetchDetail(task.task_id);
  };

  const retryTask = async (task: ImageImportTask) => {
    setRetrying(true);
    try {
      const { code, message: msg } =
        await service.ArtifactsController.retry_image_import_task(task.task_id);
      if (code === 200) {
        message.success('失败镜像已加入重试队列');
        await fetchTasks();
        if (detailOpen) await fetchDetail(task.task_id, true);
      } else {
        message.error(msg || '重试失败');
      }
    } finally {
      setRetrying(false);
    }
  };

  const uploadRequest: UploadProps['customRequest'] = async (options) => {
    setUploading(true);
    setUploadPercent(0);
    try {
      const result = await service.ArtifactsController.create_image_import_task(
        options.file as File,
        (event) => {
          if (event.total) {
            setUploadPercent(Math.round((event.loaded / event.total) * 100));
          }
        },
      );
      if (result.code === 200) {
        options.onSuccess?.(result);
        message.success('文件上传完成，已创建后台导入任务');
        setUploadOpen(false);
        await fetchTasks(1, pagination.pageSize);
        if (result.data) await openDetail(result.data);
      } else {
        throw new Error(result.message || '创建镜像导入任务失败');
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : '上传失败';
      options.onError?.(new Error(reason));
      message.error(reason);
    } finally {
      setUploading(false);
    }
  };

  const taskColumns = [
    {
      title: '镜像文件',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (filename: string, task: ImageImportTask) => (
        <Space direction="vertical" size={0}>
          <Button type="link" onClick={() => void openDetail(task)}>
            {filename}
          </Button>
          <Text type="secondary">{formatBytes(task.file_size)}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: '镜像结果',
      key: 'summary',
      width: 230,
      render: (_: unknown, task: ImageImportTask) => (
        <Space>
          <Text>共 {task.total_count}</Text>
          <Text type="success">成功 {task.success_count}</Text>
          <Text type="danger">失败 {task.failed_count}</Text>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (value?: string) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 190,
      fixed: 'right' as const,
      render: (_: unknown, task: ImageImportTask) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => void openDetail(task)}
          >
            详情
          </Button>
          {task.failed_count > 0 &&
            !['pending', 'processing'].includes(task.status) && (
              <Button
                type="link"
                icon={<RetweetOutlined />}
                loading={retrying}
                onClick={() => void retryTask(task)}
              >
                重试失败项
              </Button>
            )}
        </Space>
      ),
    },
  ];

  const itemColumns = [
    {
      title: '镜像',
      dataIndex: 'image_ref',
      key: 'image_ref',
      width: 360,
      ellipsis: true,
    },
    {
      title: '仓库项目',
      dataIndex: 'registry',
      key: 'registry',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: '处理阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 150,
      render: (stage: string) => stageLabels[stage] || stage,
    },
    {
      title: '失败原因',
      dataIndex: 'error_message',
      key: 'error_message',
      render: (reason?: string) =>
        reason ? <Text type="danger">{reason}</Text> : '-',
    },
  ];

  return (
    <Card>
      <Space
        align="start"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            镜像导入
          </Title>
          <Paragraph type="secondary">
            上传离线镜像包，并查看文件内每个镜像的导入与推送结果。
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void fetchTasks()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => setUploadOpen(true)}
          >
            上传镜像文件
          </Button>
        </Space>
      </Space>

      <Table<ImageImportTask>
        rowKey="task_id"
        loading={loading}
        dataSource={tasks}
        columns={taskColumns}
        scroll={{ x: 1100 }}
        locale={{ emptyText: <Empty description="暂无镜像导入任务" /> }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          onChange: (current, pageSize) => {
            setLoading(true);
            void fetchTasks(current, pageSize);
          },
        }}
      />

      <Modal
        title="上传离线镜像文件"
        open={uploadOpen}
        footer={null}
        closable={!uploading}
        maskClosable={!uploading}
        onCancel={() => setUploadOpen(false)}
        destroyOnHidden
      >
        <Dragger
          accept=".tar,.tar.gz,.tgz"
          maxCount={1}
          multiple={false}
          disabled={uploading}
          customRequest={uploadRequest}
          showUploadList={!uploading}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽镜像文件到此区域</p>
          <p className="ant-upload-hint">
            支持 .tar、.tar.gz、.tgz；文件大小不受应用限制
          </p>
        </Dragger>
        {uploading && (
          <Progress
            percent={uploadPercent}
            status="active"
            style={{ marginTop: 20 }}
          />
        )}
        <Alert
          type="info"
          showIcon
          message="一个文件可包含多个镜像"
          description="上传完成后由后台异步导入并逐个推送，关闭页面不会中断任务。"
          style={{ marginTop: 16 }}
        />
      </Modal>

      <Drawer
        title={`导入详情${selectedTask ? ` - ${selectedTask.filename}` : ''}`}
        width="85%"
        open={detailOpen}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        extra={
          selectedTask &&
          selectedTask.failed_count > 0 &&
          !['pending', 'processing'].includes(selectedTask.status) ? (
            <Button
              type="primary"
              icon={<RetweetOutlined />}
              loading={retrying}
              onClick={() => void retryTask(selectedTask)}
            >
              重试失败项
            </Button>
          ) : null
        }
      >
        {selectedTask && (
          <>
            <Descriptions bordered size="small" column={4}>
              <Descriptions.Item label="任务状态">
                <StatusTag status={selectedTask.status} />
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                {formatBytes(selectedTask.file_size)}
              </Descriptions.Item>
              <Descriptions.Item label="镜像总数">
                {selectedTask.total_count}
              </Descriptions.Item>
              <Descriptions.Item label="成功 / 失败">
                <Text type="success">{selectedTask.success_count}</Text> /{' '}
                <Text type="danger">{selectedTask.failed_count}</Text>
              </Descriptions.Item>
            </Descriptions>
            {selectedTask.error_message && (
              <Alert
                type="error"
                showIcon
                message="任务错误"
                description={selectedTask.error_message}
                style={{ marginTop: 16 }}
              />
            )}
            <Table<ImageImportItem>
              rowKey="item_id"
              dataSource={selectedTask.items || []}
              columns={itemColumns}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 1100 }}
              style={{ marginTop: 20 }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      selectedTask.status === 'pending'
                        ? '任务等待处理'
                        : '尚未识别到镜像'
                    }
                  />
                ),
              }}
            />
          </>
        )}
      </Drawer>
    </Card>
  );
};

export default ImageImports;
