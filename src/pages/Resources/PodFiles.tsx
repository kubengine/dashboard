import {
  Directory,
  download_file,
  list_files,
  operate_file,
  PodFile,
  upload_file,
} from '@/services/PodOperationsController';
import {
  ArrowUpOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileAddOutlined,
  FileOutlined,
  FolderAddOutlined,
  FolderOutlined,
  LinkOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Breadcrumb,
  Button,
  Checkbox,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const join = (path: string, name: string, windows: boolean) =>
  `${path.replace(windows ? /[\\/]$/ : /\/$/, '')}${
    windows ? '\\' : '/'
  }${name}`;
const parent = (path: string, windows: boolean) => {
  const sep = windows ? '\\' : '/';
  const trimmed = path.replace(windows ? /[\\/]+$/ : /\/+$/, '');
  const index = trimmed.lastIndexOf(sep);
  const result = index < 0 ? '' : trimmed.slice(0, index);
  return windows
    ? result.length <= 2
      ? path.slice(0, 2) + '\\'
      : result
    : result || '/';
};
const bytes = (size: number) =>
  size < 1024
    ? `${size} B`
    : size < 1024 ** 2
    ? `${(size / 1024).toFixed(1)} KiB`
    : size < 1024 ** 3
    ? `${(size / 1024 ** 2).toFixed(1)} MiB`
    : `${(size / 1024 ** 3).toFixed(1)} GiB`;
const errorText = (error: any) =>
  typeof error.response?.data?.detail === 'string'
    ? error.response.data.detail
    : error.message || '操作失败，请重试';
const PodFiles: React.FC<{
  namespace: string;
  name: string;
  container: string;
}> = ({ namespace, name, container }) => {
  const [directory, setDirectory] = useState<Directory>();
  const [requested, setRequested] = useState<string>();
  const [address, setAddress] = useState('');
  const [filter, setFilter] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{
    action: 'touch' | 'mkdir' | 'rename';
    row?: PodFile;
  }>();
  const [deleting, setDeleting] = useState<PodFile>();
  const [recursive, setRecursive] = useState(false);
  const [uploads, setUploads] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadResults, setUploadResults] = useState<Record<string, string>>(
    {},
  );
  const [progress, setProgress] = useState(0);
  const [overwrite, setOverwrite] = useState(false);
  const [downloading, setDownloading] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm();
  const windows = directory?.windows || false;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDirectory(undefined);
    list_files(namespace, name, container, requested, controller.signal)
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (code != 200) throw new Error(message || '目录读取失败');
        setDirectory(data);
        setAddress(data.path);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [namespace, name, container, requested, refresh]);
  const navigate = (path: string) => {
    setRequested(path);
    setFilter('');
  };
  const openEditor = (action: 'touch' | 'mkdir' | 'rename', row?: PodFile) => {
    setError('');
    setEditor({ action, row });
    form.setFieldsValue({ name: row?.name || '' });
  };
  const save = async () => {
    let values: { name: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!directory || !editor) return;
    setBusy(true);
    setError('');
    try {
      const path = join(
        directory.path,
        editor.row?.name || values.name,
        windows,
      );
      const result = await operate_file(namespace, name, container, {
        action: editor.action,
        path,
        name: editor.action === 'rename' ? values.name : undefined,
      });
      if (result.code != 200) throw new Error(result.message);
      message.success(editor.action === 'rename' ? '重命名成功' : '创建成功');
      setEditor(undefined);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!directory || !deleting) return;
    setBusy(true);
    setError('');
    try {
      const result = await operate_file(namespace, name, container, {
        action: 'delete',
        path: join(directory.path, deleting.name, windows),
        recursive: deleting.type === 'directory' && recursive,
      });
      if (result.code != 200) throw new Error(result.message);
      message.success('删除成功');
      setDeleting(undefined);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const upload = async () => {
    if (!directory) return;
    setUploading(true);
    setError('');
    const results: Record<string, string> = {};
    for (let i = 0; i < uploads.length; i++) {
      const file = uploads[i];
      setProgress(0);
      results[i] = '上传中';
      setUploadResults({ ...results });
      try {
        if (file.size > directory.maxFileBytes)
          throw new Error(`单个文件最大 ${bytes(directory.maxFileBytes)}`);
        const value = await upload_file(
          namespace,
          name,
          container,
          directory.path,
          file,
          overwrite,
          setProgress,
          directory.transferTimeoutSeconds,
        );
        if (value.code != 200) throw new Error(value.message);
        results[i] = '成功';
      } catch (e) {
        results[i] = errorText(e);
      }
      setUploadResults({ ...results });
    }
    setUploadDone(true);
    setUploading(false);
    setRefresh((v) => v + 1);
  };
  const download = async (row: PodFile) => {
    if (!directory) return;
    setDownloading(row.name);
    setError('');
    try {
      if (row.size > directory.maxFileBytes)
        throw new Error(`单个文件最大 ${bytes(directory.maxFileBytes)}`);
      const blob = await download_file(
        namespace,
        name,
        container,
        join(directory.path, row.name, windows),
        directory.transferTimeoutSeconds,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = row.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setDownloading('');
    }
  };
  const path = directory?.path || requested || '';
  const parts = windows
    ? path.split(/[\\/]/).filter(Boolean)
    : path.split('/').filter(Boolean);
  const breadcrumbs = [
    {
      title: (
        <Button
          type="link"
          onClick={() => navigate(windows ? path.slice(0, 2) + '\\' : '/')}
        >
          {windows ? path.slice(0, 2) + '\\' : '/'}
        </Button>
      ),
    },
    ...parts.slice(windows ? 1 : 0).map((part, index) => ({
      title: (
        <Button
          type="link"
          onClick={() =>
            navigate(
              windows
                ? parts.slice(0, index + 2).join('\\')
                : '/' + parts.slice(0, index + 1).join('/'),
            )
          }
        >
          {part}
        </Button>
      ),
    })),
  ];
  return (
    <div className="ke-pod-files">
      <div className="ke-pod-tools-toolbar">
        <Space wrap>
          <Button
            icon={<ArrowUpOutlined aria-hidden="true" />}
            disabled={
              !directory || parent(directory.path, windows) === directory.path
            }
            onClick={() => navigate(parent(directory!.path, windows))}
          >
            上级目录
          </Button>
          <Button
            icon={<ReloadOutlined aria-hidden="true" />}
            loading={loading}
            onClick={() => setRefresh((v) => v + 1)}
          >
            刷新目录
          </Button>
        </Space>
        <Space wrap>
          <Button
            icon={<FileAddOutlined aria-hidden="true" />}
            disabled={!directory}
            onClick={() => openEditor('touch')}
          >
            新建文件
          </Button>
          <Button
            icon={<FolderAddOutlined aria-hidden="true" />}
            disabled={!directory}
            onClick={() => openEditor('mkdir')}
          >
            新建文件夹
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined aria-hidden="true" />}
            disabled={!directory}
            onClick={() => input.current?.click()}
          >
            上传文件
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            hidden
            aria-label="选择上传文件"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              if (files.length) {
                setUploads(files);
                setUploadDone(false);
                setOverwrite(false);
                setUploadResults({});
                setProgress(0);
              }
            }}
          />
        </Space>
      </div>
      <Input.Search
        aria-label="容器目录路径"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onSearch={(value) => {
          if (value.trim()) navigate(value);
        }}
        enterButton="前往"
        placeholder="输入容器内的绝对目录路径"
      />
      <Breadcrumb className="ke-file-breadcrumb" items={breadcrumbs} />
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button onClick={() => setRefresh((v) => v + 1)}>重试</Button>
          }
        />
      )}
      <div className="ke-pod-tools-toolbar">
        <span className="ke-resource-secondary">
          {directory
            ? `${directory.entries.length} 项 · ${
                directory.windows ? 'Windows' : 'Linux'
              } · ${container}`
            : '正在读取目录'}
        </span>
        <Input.Search
          aria-label="筛选文件名称"
          placeholder="筛选当前目录文件"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          allowClear
          style={{ maxWidth: 260 }}
        />
      </div>
      <Table
        size="middle"
        loading={loading}
        dataSource={(directory?.entries || []).filter((row) =>
          row.name.toLowerCase().includes(filter.toLowerCase()),
        )}
        rowKey="name"
        scroll={{ x: 1000 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100],
          showTotal: (total) => `共 ${total} 项`,
        }}
        locale={{ emptyText: error ? '目录读取失败' : '目录为空或没有匹配项' }}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            width: 300,
            render: (value: string, row: PodFile) => (
              <Space align="start">
                {row.type === 'directory' ? (
                  <FolderOutlined aria-hidden="true" />
                ) : row.type === 'link' ? (
                  <LinkOutlined aria-hidden="true" />
                ) : (
                  <FileOutlined aria-hidden="true" />
                )}
                {row.type === 'directory' ? (
                  <Button
                    type="link"
                    className="ke-file-name"
                    onClick={() =>
                      navigate(join(directory!.path, value, windows))
                    }
                  >
                    {value}
                  </Button>
                ) : (
                  <span className="ke-file-name">{value}</span>
                )}
              </Space>
            ),
          },
          {
            title: '类型',
            dataIndex: 'type',
            width: 100,
            render: (type: string) =>
              ({
                directory: '文件夹',
                file: '文件',
                link: '符号链接',
                other: '其他',
              }[type] || type),
          },
          {
            title: '大小',
            dataIndex: 'size',
            width: 110,
            render: (size: number, row: PodFile) =>
              row.type === 'file' ? bytes(size) : '—',
          },
          {
            title: '修改时间',
            dataIndex: 'modified',
            width: 180,
            render: (value: string) => new Date(value).toLocaleString('zh-CN'),
          },
          { title: '权限/属性', dataIndex: 'mode', width: 120 },
          {
            title: '操作',
            width: 235,
            render: (_: unknown, row: PodFile) => (
              <Space wrap>
                <Button
                  size="small"
                  icon={<DownloadOutlined aria-hidden="true" />}
                  disabled={row.type !== 'file' || !!downloading}
                  loading={downloading === row.name}
                  onClick={() => download(row)}
                >
                  下载
                </Button>
                <Button
                  size="small"
                  icon={<EditOutlined aria-hidden="true" />}
                  onClick={() => openEditor('rename', row)}
                >
                  重命名
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined aria-hidden="true" />}
                  disabled={row.type === 'other'}
                  onClick={() => {
                    setRecursive(false);
                    setError('');
                    setDeleting(row);
                  }}
                >
                  删除
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <p className="ke-resource-secondary">
        {directory
          ? `单文件上传、下载上限 ${bytes(directory.maxFileBytes)}；`
          : ''}
        上传完成后才替换目标文件。符号链接仅展示或删除链接本身，下载请使用实际路径。
      </p>
      <Modal
        title={
          editor?.action === 'mkdir'
            ? '新建文件夹'
            : editor?.action === 'rename'
            ? '重命名'
            : '新建文件'
        }
        open={!!editor}
        onCancel={() => {
          if (!busy) setEditor(undefined);
        }}
        onOk={save}
        confirmLoading={busy}
        closable={!busy}
        maskClosable={!busy}
        cancelButtonProps={{ disabled: busy }}
        destroyOnHidden
      >
        <Typography.Paragraph className="ke-resource-secondary">
          目录：{directory?.path}
        </Typography.Paragraph>
        {error && <Alert showIcon type="error" message={error} />}
        <Form
          name="pod-file-editor"
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, whitespace: true, message: '请输入名称' },
              {
                validator: (_, value) =>
                  !value ||
                  (!/[\\/\0]/.test(value) && value !== '.' && value !== '..')
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error('名称不能包含路径分隔符或使用 .、..'),
                      ),
              },
            ]}
          >
            <Input
              aria-label="文件名称"
              autoFocus
              maxLength={255}
              onPressEnter={() => save()}
              autoComplete="off"
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="删除确认"
        open={!!deleting}
        onCancel={() => {
          if (!busy) setDeleting(undefined);
        }}
        onOk={remove}
        okText="删除"
        okButtonProps={{ danger: true }}
        confirmLoading={busy}
        closable={!busy}
        maskClosable={!busy}
        cancelButtonProps={{ disabled: busy }}
      >
        <Typography.Paragraph>
          删除
          {deleting?.type === 'directory'
            ? '文件夹'
            : deleting?.type === 'link'
            ? '符号链接'
            : '文件'}
          ：<Typography.Text strong>{deleting?.name}</Typography.Text>
        </Typography.Paragraph>
        <Typography.Paragraph className="ke-resource-secondary">
          {directory?.path}
        </Typography.Paragraph>
        {deleting?.type === 'directory' && (
          <Checkbox
            checked={recursive}
            onChange={(e) => setRecursive(e.target.checked)}
          >
            递归删除文件夹及全部内容
          </Checkbox>
        )}
        {error && <Alert showIcon type="error" message={error} />}
      </Modal>
      <Modal
        title={`上传到 ${directory?.path || requested || ''}`}
        open={uploads.length > 0}
        onCancel={() => {
          if (!uploading) setUploads([]);
        }}
        onOk={uploadDone ? () => setUploads([]) : upload}
        okText={uploadDone ? '完成' : '开始上传'}
        confirmLoading={uploading}
        cancelButtonProps={{ disabled: uploading }}
        closable={!uploading}
        maskClosable={!uploading}
        keyboard={!uploading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {uploads.map((file, index) => (
            <div key={index} className="ke-upload-row">
              <span>
                {file.name}
                <small>{bytes(file.size)}</small>
              </span>
              <Tooltip title={uploadResults[index]}>
                <Tag
                  color={
                    uploadResults[index] === '成功'
                      ? 'success'
                      : uploadResults[index] === '上传中'
                      ? 'processing'
                      : uploadResults[index]
                      ? 'error'
                      : 'default'
                  }
                >
                  {uploadResults[index] || '等待上传'}
                </Tag>
              </Tooltip>
            </div>
          ))}
          <Checkbox
            checked={overwrite}
            disabled={uploading || uploadDone}
            onChange={(e) => setOverwrite(e.target.checked)}
          >
            覆盖已有同名文件
          </Checkbox>
          {uploading && (
            <Progress
              percent={progress}
              status="active"
              format={(value) => (value === 100 ? '写入容器…' : `${value}%`)}
            />
          )}
        </Space>
      </Modal>
    </div>
  );
};
export default PodFiles;
