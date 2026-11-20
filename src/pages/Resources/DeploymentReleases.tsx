import {
  deployment_history,
  DeploymentCurrent,
  DeploymentHistory,
  DeploymentPending,
  NativeRevision,
  OperationCommand,
  preview_deployment_release,
  ReleasePreview,
} from '@/services/DeploymentController';
import { getRequestErrorMessage } from '@/utils/request';
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  namespace: string;
  name: string;
  current?: DeploymentCurrent;
  writable: boolean;
  readable: boolean;
  disabled: boolean;
  submitting: boolean;
  recoveryPending: boolean;
  operationError: string;
  onClearError: () => void;
  identity: string;
  onSubmit: (request: DeploymentPending) => Promise<boolean>;
}

const DeploymentReleases: React.FC<Props> = ({
  namespace,
  name,
  current,
  writable,
  readable,
  disabled,
  submitting,
  recoveryPending,
  operationError,
  onClearError,
  identity,
  onSubmit,
}) => {
  const [history, setHistory] = useState<DeploymentHistory>();
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [writeDenied, setWriteDenied] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [action, setAction] = useState<'image' | 'rollback'>();
  const [source, setSource] = useState<NativeRevision>();
  const [snapshot, setSnapshot] = useState<DeploymentCurrent>();
  const [selected, setSelected] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ReleasePreview>();
  const [previewing, setPreviewing] = useState(false);
  const [expired, setExpired] = useState(false);
  const sequence = useRef(0);
  const previewController = useRef<AbortController>();
  const errorRef = useRef<HTMLDivElement>(null);
  const mayWrite = writable && !writeDenied;

  const invalidate = () => {
    sequence.current += 1;
    previewController.current?.abort();
    setPreview(undefined);
    setPreviewing(false);
    setExpired(false);
    setError('');
  };

  useEffect(() => {
    invalidate();
    setAction(undefined);
    setHistory(undefined);
    setWriteDenied(false);
    return () => {
      sequence.current += 1;
      previewController.current?.abort();
    };
  }, [identity]);

  useEffect(() => {
    if (!mayWrite || !readable) {
      invalidate();
      setAction(undefined);
    }
  }, [mayWrite, readable]);

  useEffect(() => {
    const controller = new AbortController();
    setHistory(undefined);
    setHistoryError('');
    if (!readable || !current) return;
    setLoading(true);
    deployment_history(namespace, name, controller.signal)
      .then(({ data }) => {
        if (!controller.signal.aborted) setHistory(data);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setHistoryError(getRequestErrorMessage(e, '原生发布历史读取失败'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [identity, readable, current?.uid, current?.nativeRevision, refresh]);

  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => {
      setExpired(true);
      setError('预检已过期，请重新预检后确认。');
    }, Math.max(0, Date.parse(preview.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [preview]);

  useEffect(() => {
    if (error || operationError) errorRef.current?.focus();
  }, [error, operationError]);

  const open = (value: 'image' | 'rollback', revision?: NativeRevision) => {
    onClearError();
    invalidate();
    setAction(value);
    setSource(revision);
    setSnapshot(current);
    setSelected([]);
    setImages(
      Object.fromEntries(
        (history?.containers || []).map((item) => [item.name, item.image]),
      ),
    );
  };

  const invalidImage = (container: string) => {
    const image = images[container] || '';
    return (
      !image || /\s/.test(image) || !/[:@]/.test(image.split('/').pop() || '')
    );
  };
  const invalid =
    action === 'image' && (!selected.length || selected.some(invalidImage));
  const parameters = (): Omit<OperationCommand, 'request_id'> => ({
    uid: snapshot!.uid,
    resource_version: snapshot!.resourceVersion,
    ...(action === 'image'
      ? {
          containers: selected.map((container) => ({
            name: container,
            image: images[container],
          })),
        }
      : { revision: source!.revision, replica_set_uid: source!.replicaSetUid }),
  });
  const prepare = async () => {
    if (!action || !snapshot || invalid || previewing || !mayWrite) return;
    invalidate();
    onClearError();
    const id = sequence.current;
    const controller = new AbortController();
    previewController.current = controller;
    setPreviewing(true);
    try {
      const { data } = await preview_deployment_release(
        namespace,
        name,
        action,
        parameters(),
        controller.signal,
      );
      if (id === sequence.current) setPreview(data);
    } catch (e: any) {
      if (id !== sequence.current || controller.signal.aborted) return;
      setError(getRequestErrorMessage(e, '发布预检失败'));
      if ([e?.status, e?.response?.status, e?.code].includes(403))
        setWriteDenied(true);
    } finally {
      if (id === sequence.current) setPreviewing(false);
    }
  };
  const confirm = async () => {
    if (
      !action ||
      !preview ||
      expired ||
      recoveryPending ||
      submitting ||
      !mayWrite ||
      disabled
    )
      return;
    const request: DeploymentPending = {
      action,
      body: {
        ...parameters(),
        preview_token: preview.previewToken,
        request_id: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((value) => value.toString(16).padStart(2, '0'))
          .join(''),
      },
    };
    if (await onSubmit(request)) {
      invalidate();
      setAction(undefined);
      setRefresh((value) => value + 1);
    } else {
      invalidate();
    }
  };

  if (!readable) return null;
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div className="ke-deployment-actions">
        {mayWrite && (
          <Button
            disabled={disabled || !history || !!historyError}
            onClick={() => open('image')}
          >
            更新镜像
          </Button>
        )}
        <Button
          loading={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          刷新原生历史
        </Button>
      </div>
      <Typography.Title level={5} style={{ margin: 0 }}>
        Kubernetes 原生发布历史
      </Typography.Title>
      <Typography.Text type="secondary">
        仅展示仍保留的 ReplicaSet，与平台 YAML 版本分别编号；较早 revision
        不代表稳定版本。
      </Typography.Text>
      {historyError && <Alert type="error" showIcon message={historyError} />}
      <Table<NativeRevision>
        size="small"
        rowKey="replicaSetUid"
        loading={loading}
        dataSource={history?.items || []}
        scroll={{ x: 720 }}
        pagination={{ pageSize: 5, showSizeChanger: false }}
        locale={{
          emptyText: '暂无可用原生历史，历史可能已被 Kubernetes 清理。',
        }}
        columns={[
          {
            title: '原生 revision',
            dataIndex: 'revision',
            render: (value) => value || '缺失',
          },
          { title: 'ReplicaSet', dataIndex: 'replicaSet' },
          {
            title: '普通容器镜像',
            key: 'images',
            render: (_, item) => (
              <Space direction="vertical">
                {item.containers.map((container) => (
                  <Typography.Text key={container.name}>
                    {container.name}：{container.image}
                  </Typography.Text>
                ))}
              </Space>
            ),
          },
          {
            title: '回滚状态',
            key: 'rollback',
            render: (_, item) => (
              <Space direction="vertical">
                {item.canRollback ? (
                  <Tag>可预览</Tag>
                ) : (
                  <Typography.Text type="secondary">
                    {item.reason}
                  </Typography.Text>
                )}
                {mayWrite && item.canRollback && (
                  <Button
                    disabled={disabled || !!historyError}
                    onClick={() => open('rollback', item)}
                    aria-label={`预览回滚到 revision ${item.revision}`}
                  >
                    预览回滚
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        className="ke-deployment-release-modal"
        title={
          action === 'rollback'
            ? `回滚到原生 revision ${source?.revision}`
            : '更新 Deployment 镜像'
        }
        open={!!action}
        width={900}
        destroyOnClose
        onCancel={() => {
          if (!submitting) {
            invalidate();
            setAction(undefined);
          }
        }}
        footer={
          <Space wrap>
            <Button
              disabled={submitting}
              onClick={() => {
                invalidate();
                setAction(undefined);
              }}
            >
              取消
            </Button>
            <Button
              loading={previewing}
              disabled={
                invalid ||
                submitting ||
                disabled ||
                !mayWrite ||
                recoveryPending
              }
              onClick={prepare}
            >
              执行预检
            </Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={
                !preview ||
                expired ||
                previewing ||
                disabled ||
                !mayWrite ||
                recoveryPending
              }
              onClick={confirm}
            >
              确认发布
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2 }}
            items={[
              {
                key: 'target',
                label: '目标',
                children: `${namespace} / ${name}`,
              },
              { key: 'uid', label: 'UID', children: snapshot?.uid },
              {
                key: 'rv',
                label: 'resourceVersion',
                children: snapshot?.resourceVersion,
              },
              {
                key: 'strategy',
                label: '更新策略',
                children: `${snapshot?.strategy}；保留当前副本数 ${snapshot?.replicas}`,
              },
            ]}
          />
          <Alert
            type="warning"
            showIcon
            message={
              action === 'rollback'
                ? '仅恢复历史 Pod 模板，保留当前副本数和其他 Deployment 配置。不会恢复 ConfigMap、Secret、PVC 或业务数据；可变镜像标签可能已指向其他内容。回滚后仍需新的发布观察。'
                : '按名称更新选中的普通容器，可一次发布多个镜像。预检不证明镜像存在、可拉取或已通过安全扫描。'
            }
          />
          {action === 'image' && (
            <Form layout="vertical">
              {(history?.containers || []).map((container) => (
                <Form.Item
                  key={container.name}
                  validateStatus={
                    selected.includes(container.name) &&
                    invalidImage(container.name)
                      ? 'error'
                      : undefined
                  }
                  help={
                    selected.includes(container.name) &&
                    invalidImage(container.name)
                      ? '请填写镜像名称及 tag 或 sha256 digest，不含空白。'
                      : undefined
                  }
                  label={
                    <Checkbox
                      checked={selected.includes(container.name)}
                      disabled={submitting}
                      onChange={(event) => {
                        invalidate();
                        setSelected((value) =>
                          event.target.checked
                            ? [...value, container.name]
                            : value.filter((item) => item !== container.name),
                        );
                      }}
                    >
                      更新容器 {container.name}
                    </Checkbox>
                  }
                >
                  <Typography.Paragraph
                    type="secondary"
                    style={{ marginBottom: 6 }}
                  >
                    当前镜像：{container.image}
                  </Typography.Paragraph>
                  <Input
                    aria-label={`${container.name} 目标镜像`}
                    value={images[container.name] || ''}
                    disabled={!selected.includes(container.name) || submitting}
                    maxLength={512}
                    onChange={(event) => {
                      invalidate();
                      setImages((value) => ({
                        ...value,
                        [container.name]: event.target.value,
                      }));
                    }}
                  />
                </Form.Item>
              ))}
            </Form>
          )}
          {(error || operationError) && (
            <div ref={errorRef} tabIndex={-1} role="alert">
              <Alert type="error" showIcon message={error || operationError} />
            </div>
          )}
          {preview && (
            <div aria-live="polite">
              <Typography.Paragraph>
                预检有效至 {new Date(preview.expiresAt).toLocaleTimeString()}
                ；修改输入后须重新预检。非镜像字段只展示脱敏变化。
              </Typography.Paragraph>
              <Table<ReleasePreview['changes'][number]>
                size="small"
                rowKey="path"
                dataSource={preview.changes}
                scroll={{ x: 650 }}
                pagination={false}
                columns={[
                  { title: '字段路径', dataIndex: 'path' },
                  {
                    title: '变化',
                    dataIndex: 'action',
                    render: (value) =>
                      ({ add: '新增', remove: '删除', replace: '替换' }[
                        value as string
                      ] || value),
                  },
                  {
                    title: '当前',
                    dataIndex: 'before',
                    render: (value) => (
                      <Typography.Text style={{ overflowWrap: 'anywhere' }}>
                        {String(value ?? '—')}
                      </Typography.Text>
                    ),
                  },
                  {
                    title: '目标',
                    dataIndex: 'after',
                    render: (value) => (
                      <Typography.Text style={{ overflowWrap: 'anywhere' }}>
                        {String(value ?? '—')}
                      </Typography.Text>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Space>
      </Modal>
    </Space>
  );
};

export default DeploymentReleases;
