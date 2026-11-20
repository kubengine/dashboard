import {
  deployment_operations,
  deploymentActionLabels,
  DeploymentCurrent,
  DeploymentOperation,
  DeploymentPending,
  submit_deployment_operation,
} from '@/services/DeploymentController';
import { usePermissions } from '@/utils/permissions';
import { getRequestErrorMessage } from '@/utils/request';
import { Link } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  InputNumber,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import './DeploymentOperations.less';
import DeploymentReleases from './DeploymentReleases';

const states: Record<string, [string, string]> = {
  pending: ['待执行', 'default'],
  running: ['执行中', 'processing'],
  succeeded: ['已完成', 'success'],
  failed: ['执行失败', 'error'],
  timed_out: ['超时 / 待核实', 'warning'],
  superseded: ['已被后续变更替代', 'default'],
  permission_revoked: ['执行前权限已撤销', 'error'],
};
const phases: Record<string, string> = {
  queued: '等待 worker',
  writing: '写入结果核实中',
  observing: '健康观察',
  verifying: '只读核实',
};
const writes: Record<string, string> = {
  pending: '尚未确认写入',
  accepted: '集群已接受',
  rejected: '未执行或集群已拒绝',
  unknown: '写入结果不确定',
};
const active = new Set(['pending', 'running', 'timed_out']);
type Pending = DeploymentPending;

const DeploymentOperations: React.FC<{ namespace: string; name: string }> = ({
  namespace,
  name,
}) => {
  const { can, user } = usePermissions();
  const [current, setCurrent] = useState<DeploymentCurrent>();
  const [items, setItems] = useState<DeploymentOperation[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [commandError, setCommandError] = useState('');
  const [missing, setMissing] = useState('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [writeDenied, setWriteDenied] = useState(false);
  const [modal, setModal] = useState<'scale' | 'restart'>();
  const [snapshot, setSnapshot] = useState<DeploymentCurrent>();
  const [replicas, setReplicas] = useState<number | null>(null);
  const [confirmZero, setConfirmZero] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<Pending>();
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const submittingRef = useRef(new Set<string>());
  const key = `deployment-request:${user?.user_id}:${namespace}:${name}`;
  const targetRef = useRef(key);
  targetRef.current = key;
  const path = `/resources/deployment/${encodeURIComponent(
    namespace,
  )}/${encodeURIComponent(name)}`;
  const writable = can('resource.update', namespace) && !denied && !writeDenied;
  const selectedOperation =
    items.find((item) => item.id === selected) || items[0];
  const blocked = items.some((item) => active.has(item.status));

  useEffect(() => {
    setPending(undefined);
    setModal(undefined);
    setNotice('');
    setCommandError('');
    setSelected('');
    setWriteDenied(false);
    setSubmitting(submittingRef.current.has(key));
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) setPending(JSON.parse(saved));
    } catch {
      setError('无法恢复本地请求标识，请先查看服务端记录核实结果');
    }
  }, [key, user?.revision]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setCurrent(undefined);
    setItems([]);
    setLoading(true);
    setDenied(false);
    const load = async () => {
      try {
        const { data } = await deployment_operations(
          namespace,
          name,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setCurrent(data.current || undefined);
        setItems(data.items || []);
        setMissing(data.currentError || '');
        setError('');
        setPending((value) => {
          if (
            value &&
            data.items.some(
              (item: DeploymentOperation) =>
                item.requestId === value.body.request_id,
            )
          ) {
            sessionStorage.removeItem(key);
            return undefined;
          }
          return value;
        });
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setError(
          getRequestErrorMessage(
            e,
            '进度暂时无法更新，将继续读取；不会重新发起操作',
          ),
        );
        if (
          e?.status === 403 ||
          e?.response?.status === 403 ||
          e?.code === 403
        ) {
          setDenied(true);
          setCurrent(undefined);
          setItems([]);
          setModal(undefined);
          return;
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
      if (!controller.signal.aborted) timer = setTimeout(load, 5000);
    };
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [namespace, name, key, refresh, user?.revision]);

  useEffect(() => {
    if (!writable) setModal(undefined);
  }, [writable]);

  const submit = async (request: Pending): Promise<boolean> => {
    if (submittingRef.current.has(key)) return false;
    submittingRef.current.add(key);
    setSubmitting(true);
    setError('');
    setCommandError('');
    const requestKey = key;
    try {
      sessionStorage.setItem(key, JSON.stringify(request));
      setPending(request);
      const { data } = await submit_deployment_operation(
        namespace,
        name,
        request.action,
        request.body,
      );
      if (targetRef.current !== requestKey) return false;
      setSelected(data.operation.id);
      setNotice('操作已受理，正在跟踪集群写入和健康状态。');
      sessionStorage.removeItem(key);
      setPending(undefined);
      setModal(undefined);
      setRefresh((value) => value + 1);
      return true;
    } catch (e: any) {
      if (targetRef.current !== requestKey) return false;
      setCommandError(
        getRequestErrorMessage(e, '请求结果待核实，请查看操作记录或核实原请求'),
      );
      const status = e?.status || e?.response?.status || e?.code;
      if ([400, 403, 404, 409, 422].includes(status)) {
        sessionStorage.removeItem(key);
        setPending(undefined);
      }
      if (status === 403) {
        setWriteDenied(true);
        setModal(undefined);
      }
      return false;
    } finally {
      submittingRef.current.delete(requestKey);
      if (targetRef.current === requestKey) setSubmitting(false);
    }
  };
  const open = (action: 'scale' | 'restart') => {
    setSnapshot(current);
    setReplicas(current?.replicas ?? null);
    setConfirmZero(false);
    setModal(action);
    setError('');
    setCommandError('');
  };
  const confirm = () => {
    if (!modal || !snapshot) return;
    const request: Pending = pending || {
      action: modal,
      body: {
        request_id: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((value) => value.toString(16).padStart(2, '0'))
          .join(''),
        uid: snapshot.uid,
        resource_version: snapshot.resourceVersion,
        ...(modal === 'scale'
          ? { replicas: replicas!, confirm_zero: confirmZero }
          : {}),
      },
    };
    submit(request);
  };
  const disabled =
    loading ||
    !current ||
    !!error ||
    blocked ||
    !!pending ||
    current.paused ||
    current.deleting;
  const scaleDisabled =
    disabled || !!current?.hpaError || !!current?.hpas.length;

  return (
    <Card
      className="ke-deployment-operations"
      title="Deployment 运维"
      style={{ marginBottom: 20 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {loading && <Spin aria-label="正在读取运维状态" />}
        {(error || commandError) && (
          <Alert
            type="error"
            showIcon
            message={error || commandError}
            action={
              <Button onClick={() => setRefresh((value) => value + 1)}>
                重新读取
              </Button>
            }
          />
        )}
        {missing && <Alert type="warning" showIcon message={missing} />}
        {notice && (
          <Alert
            type="info"
            showIcon
            message={notice}
            closable
            onClose={() => setNotice('')}
          />
        )}
        {pending && writable && (
          <Alert
            type="warning"
            showIcon
            message="上次请求结果待核实。核实原请求会复用相同标识和参数，不创建第二次操作。"
            action={
              <Button loading={submitting} onClick={() => submit(pending)}>
                核实原请求
              </Button>
            }
          />
        )}
        {current && (
          <>
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                {
                  key: 'replicas',
                  label: '当前目标副本',
                  children: current.replicas,
                },
                {
                  key: 'strategy',
                  label: '更新策略',
                  children: current.strategy,
                },
                {
                  key: 'paused',
                  label: '资源状态',
                  children: current.deleting
                    ? '删除中'
                    : current.paused
                    ? '已暂停'
                    : '可操作',
                },
                {
                  key: 'hpa',
                  label: 'HPA 管理',
                  children:
                    current.hpaError || current.hpas.join('、') || '未发现 HPA',
                },
                {
                  key: 'nativeRevision',
                  label: 'Kubernetes revision',
                  children: current.nativeRevision || '—',
                },
                {
                  key: 'deadline',
                  label: '集群进度期限',
                  children: current.progressDeadlineSeconds
                    ? `${current.progressDeadlineSeconds} 秒`
                    : '未设置',
                },
              ]}
            />
            {writable && (
              <div className="ke-deployment-actions">
                <Button disabled={scaleDisabled} onClick={() => open('scale')}>
                  扩缩容
                </Button>
                <Button disabled={disabled} onClick={() => open('restart')}>
                  滚动重启
                </Button>
              </div>
            )}
            {(current.hpaError || current.hpas.length > 0) && (
              <Alert
                type="warning"
                message={
                  current.hpaError || 'HPA 正在管理副本数，本期禁止手动扩缩容。'
                }
                showIcon
              />
            )}
            {blocked && (
              <Typography.Text type="secondary">
                已有进行中或待核实操作，请查看下方记录。
              </Typography.Text>
            )}
          </>
        )}
        <DeploymentReleases
          namespace={namespace}
          name={name}
          current={current}
          readable={can('resource.read', namespace) && !denied}
          writable={writable}
          disabled={!!disabled}
          submitting={submitting}
          recoveryPending={!!pending}
          operationError={commandError}
          onClearError={() => setCommandError('')}
          identity={`${key}:${user?.revision}`}
          onSubmit={submit}
        />
        {selectedOperation && (
          <div aria-live="polite">
            <Space wrap style={{ marginBottom: 12 }}>
              <Typography.Text strong>
                {deploymentActionLabels[selectedOperation.action]}
              </Typography.Text>
              <Tag color={states[selectedOperation.status]?.[1]}>
                {states[selectedOperation.status]?.[0] ||
                  selectedOperation.status}
              </Tag>
              <Typography.Text>
                {phases[selectedOperation.phase] || selectedOperation.phase} ·{' '}
                {writes[selectedOperation.writeStatus]}
              </Typography.Text>
            </Space>
            <Alert
              type={
                selectedOperation.status === 'succeeded'
                  ? 'success'
                  : selectedOperation.status === 'failed'
                  ? 'error'
                  : 'info'
              }
              showIcon
              message={
                selectedOperation.reason || '操作已受理，等待 worker 执行'
              }
              description={`目标 UID：${selectedOperation.uid}`}
            />
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2, lg: 3 }}
              style={{ marginTop: 12 }}
              items={[
                {
                  key: 'target',
                  label: '目标副本',
                  children: selectedOperation.targetReplicas,
                },
                ...(
                  ['updated', 'ready', 'available', 'total', 'old'] as const
                ).map((key, index) => ({
                  key,
                  label: ['已更新', '就绪', '可用', '实际总数', '旧副本'][
                    index
                  ],
                  children: selectedOperation.progress[key] ?? '—',
                })),
                {
                  key: 'generation',
                  label: '目标 / 已观察 generation',
                  children: `${selectedOperation.targetGeneration} / ${
                    selectedOperation.progress.observedGeneration ?? '—'
                  }`,
                },
                {
                  key: 'version',
                  label: '平台 YAML 版本记录',
                  children: (
                    <Link to={`${path}?tab=yaml`}>
                      #{selectedOperation.revisionId}
                    </Link>
                  ),
                },
                {
                  key: 'native',
                  label: 'Kubernetes revision',
                  children: selectedOperation.progress.nativeRevision || '—',
                },
                ...(selectedOperation.release?.sourceRevision
                  ? [
                      {
                        key: 'source',
                        label: '回滚来源原生 revision',
                        children: `${selectedOperation.release.sourceRevision}（ReplicaSet UID：${selectedOperation.release.sourceReplicaSetUid}）`,
                      },
                    ]
                  : []),
                {
                  key: 'deadline',
                  label: '平台观察截止',
                  children: new Date(
                    selectedOperation.deadline,
                  ).toLocaleString(),
                },
                {
                  key: 'request',
                  label: '请求编号',
                  children: (
                    <Typography.Text copyable>
                      {selectedOperation.requestId}
                    </Typography.Text>
                  ),
                },
                {
                  key: 'audit',
                  label: '执行审计编号',
                  children: (
                    <Typography.Text copyable>
                      {selectedOperation.auditId}
                    </Typography.Text>
                  ),
                },
              ]}
            />
            {selectedOperation.progress.diagnostics?.map((item) => (
              <Alert
                key={item.code}
                type="warning"
                showIcon
                message={`${item.code}：${item.message}`}
                style={{ marginBottom: 8 }}
              />
            ))}
            <Space wrap>
              <Link to={`${path}?tab=pods`}>查看关联 Pod</Link>
              <Link to={`${path}?tab=events`}>查看事件</Link>
              {selectedOperation.progress.pods?.map((pod) => (
                <Link
                  key={pod.name}
                  to={`/resources/pod/${encodeURIComponent(
                    namespace,
                  )}/${encodeURIComponent(pod.name)}?tab=logs`}
                >
                  {pod.name} 日志
                </Link>
              ))}
            </Space>
          </div>
        )}
        <Table<DeploymentOperation>
          size="small"
          rowKey="id"
          dataSource={items}
          scroll={{ x: 660 }}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          locale={{ emptyText: '暂无操作记录' }}
          columns={[
            {
              title: '操作',
              key: 'action',
              render: (_, item) => (
                <Button
                  type="link"
                  aria-label={`查看${
                    deploymentActionLabels[item.action]
                  }操作记录，${new Date(item.createdAt).toLocaleString()}`}
                  onClick={() => setSelected(item.id)}
                >
                  {item.action === 'scale'
                    ? `扩缩容 ${item.beforeReplicas} → ${item.targetReplicas}`
                    : deploymentActionLabels[item.action]}
                </Button>
              ),
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value: string) => (
                <Tag color={states[value]?.[1]}>
                  {states[value]?.[0] || value}
                </Tag>
              ),
            },
            { title: '发起者', dataIndex: 'actor' },
            {
              title: '发起时间',
              dataIndex: 'createdAt',
              render: (value: string) => new Date(value).toLocaleString(),
            },
          ]}
        />
      </Space>
      <Modal
        title={modal === 'scale' ? '确认扩缩容' : '确认滚动重启'}
        open={!!modal}
        onCancel={() => !submitting && setModal(undefined)}
        confirmLoading={submitting}
        okText="确认提交"
        cancelText="取消"
        onOk={confirm}
        okButtonProps={{
          disabled:
            !writable ||
            !!pending ||
            (modal === 'scale' &&
              (replicas === null ||
                !Number.isInteger(replicas) ||
                replicas < 0 ||
                replicas > 2147483647 ||
                replicas === snapshot?.replicas ||
                (replicas === 0 && !confirmZero))),
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Typography.Text>
            目标：{namespace} / {name}
          </Typography.Text>
          <Typography.Text>
            更新策略：{snapshot?.strategy}，当前目标副本：{snapshot?.replicas}
          </Typography.Text>
          {modal === 'scale' ? (
            <>
              <Typography.Text>
                HPA：{snapshot?.hpas.join('、') || '未发现 HPA'}
                ；执行前将再次检查。
              </Typography.Text>
              <Form layout="vertical">
                <Form.Item label="目标副本数" required>
                  <InputNumber
                    aria-label="目标副本数"
                    min={0}
                    max={2147483647}
                    precision={0}
                    value={replicas}
                    onChange={setReplicas}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Form>
              {replicas === 0 && (
                <>
                  <Alert
                    type="warning"
                    showIcon
                    message="缩容到 0 将停止此 Deployment 的全部实例，可能导致服务不可用。"
                  />
                  <Checkbox
                    checked={confirmZero}
                    onChange={(event) => setConfirmZero(event.target.checked)}
                  >
                    我确认缩容到 0 并接受停服影响
                  </Checkbox>
                </>
              )}
            </>
          ) : (
            <Alert
              type="warning"
              showIcon
              message={`将更新 Pod 模板的重启标记，按 ${snapshot?.strategy} 策略执行。可能中断服务，不会自动解除暂停或自动回滚。`}
            />
          )}
          <Typography.Text type="secondary">
            提交后持续观察实际结果。超时只读核实，不会自动重试写入。
          </Typography.Text>
          {(error || commandError) && (
            <Alert type="error" showIcon message={error || commandError} />
          )}
        </Space>
      </Modal>
    </Card>
  );
};

export default DeploymentOperations;
