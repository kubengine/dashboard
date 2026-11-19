import YamlDisplay from '@/components/YamlDisplay';
import * as service from '@/services/ResourceYamlController';
import {
  ChangedField,
  Revision,
  YamlPreview,
} from '@/services/ResourceYamlController';
import { usePermissions } from '@/utils/permissions';
import { getRequestErrorMessage, isSuccessCode } from '@/utils/request';
import {
  DownloadOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { parseDocument } from 'yaml';
import { downloadText } from './PodLogs';

const statuses: Record<string, { text: string; color: string }> = {
  applied: { text: '已提交集群', color: 'success' },
  failed: { text: '集群拒绝', color: 'error' },
  pending: { text: '结果待确认', color: 'warning' },
  unknown: { text: '结果待核实', color: 'warning' },
};
const errorText = getRequestErrorMessage;

const Diff: React.FC<{ changes: ChangedField[] }> = ({ changes }) => (
  <Table
    size="small"
    rowKey="path"
    dataSource={changes}
    scroll={{ x: 720 }}
    pagination={{ defaultPageSize: 10, showSizeChanger: true }}
    columns={[
      {
        title: '字段路径',
        dataIndex: 'path',
        width: 260,
        render: (path: string) => <code className="ke-yaml-path">{path}</code>,
      },
      {
        title: '操作',
        dataIndex: 'action',
        width: 85,
        render: (action: string) => (
          <Tag
            color={
              action === 'remove'
                ? 'error'
                : action === 'add'
                ? 'success'
                : 'processing'
            }
          >
            {{ add: '新增', remove: '删除', replace: '修改' }[action]}
          </Tag>
        ),
      },
      ...(['before', 'after'] as const).map((key) => ({
        title: key === 'before' ? '修改前' : '修改后',
        dataIndex: key,
        render: (value: unknown, row: ChangedField) => (
          <Typography.Paragraph
            className="ke-yaml-value"
            ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}
          >
            {(key === 'before' && row.action === 'add') ||
            (key === 'after' && row.action === 'remove')
              ? '—'
              : typeof value === 'string'
              ? value
              : JSON.stringify(value, null, 2)}
          </Typography.Paragraph>
        ),
      })),
    ]}
  />
);

const ResourceYaml: React.FC<{
  type: string;
  namespace: string;
  name: string;
  yaml: string;
  reveal: boolean;
  onApplied: () => void;
}> = ({ type, namespace, name, yaml, reveal, onApplied }) => {
  const { can } = usePermissions();
  const [opening, setOpening] = useState(false);
  const [editing, setEditing] = useState(false);
  const [base, setBase] = useState<{
    yaml: string;
    uid: string;
    resourceVersion: string;
  }>();
  const [draft, setDraft] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<YamlPreview>();
  const [requestId, setRequestId] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [history, setHistory] = useState<Revision[]>([]);
  const [total, setTotal] = useState(0);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selected, setSelected] = useState<Revision>();
  const [detailLoading, setDetailLoading] = useState(0);
  const dirty = editing && (draft !== base?.yaml || !!comment);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  useEffect(() => {
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError('');
    service
      .versions(type, namespace, name, page, controller.signal)
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (!isSuccessCode(code)) throw new Error(message);
        setHistory(data.items);
        setTotal(data.total);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setHistoryError(errorText(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [type, namespace, name, page, refresh]);
  const open = async () => {
    setOpening(true);
    setError('');
    try {
      const result = await service.editor(type, namespace, name, reveal);
      if (!isSuccessCode(result.code)) throw new Error(result.message);
      if (!result.data.editable) throw new Error(result.data.reason);
      setBase(result.data);
      setDraft(result.data.yaml);
      setComment('');
      setPreview(undefined);
      setEditing(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setOpening(false);
    }
  };
  const cancel = () => {
    if (saving || checking) return;
    if (dirty)
      Modal.confirm({
        title: '放弃未应用的 YAML 修改？',
        content: '本次编辑尚未保存到集群。',
        okText: '放弃修改',
        cancelText: '继续编辑',
        onOk: () => setEditing(false),
      });
    else setEditing(false);
  };
  const payload = () => ({
    yaml_text: draft,
    uid: base!.uid,
    resource_version: base!.resourceVersion,
    comment,
    reveal_secret: reveal,
  });
  const check = async () => {
    setChecking(true);
    setError('');
    try {
      if (parseDocument(draft, { uniqueKeys: true }).errors.length)
        throw new Error('YAML 语法不正确，请检查缩进、重复字段和文档结构');
      const result = await service.preview(type, namespace, name, payload());
      if (!isSuccessCode(result.code)) throw new Error(result.message);
      if (result.data.noChanges) {
        message.info('没有配置改动，无需应用');
        return;
      }
      setRequestId(
        Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((v) => v.toString(16).padStart(2, '0'))
          .join(''),
      );
      setPreview(result.data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setChecking(false);
    }
  };
  const apply = async () => {
    if (!preview || !base || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await service.apply_yaml(type, namespace, name, {
        ...payload(),
        request_id: requestId,
        preview_hash: preview.previewHash,
      });
      if (!isSuccessCode(result.code)) throw new Error(result.message);
      if (!result.data.noChanges && result.data.revision?.status !== 'applied')
        throw new Error(
          result.data.warning ||
            '该请求已登记，结果尚未确认。请查看版本历史并刷新资源，重新校验前不要重复应用。',
        );
      setEditing(false);
      setPreview(undefined);
      message.success('配置已提交集群，控制器将异步执行变更');
      onApplied();
    } catch (e) {
      setError(errorText(e));
      setPreview(undefined);
      setRefresh((v) => v + 1);
    } finally {
      setSaving(false);
    }
  };
  const detail = async (row: Revision) => {
    setDetailLoading(row.id);
    setHistoryError('');
    try {
      const result = await service.version(
        type,
        namespace,
        name,
        row.id,
        reveal,
      );
      if (!isSuccessCode(result.code)) throw new Error(result.message);
      setSelected(result.data);
    } catch (e) {
      setHistoryError(errorText(e));
    } finally {
      setDetailLoading(0);
    }
  };
  return (
    <Space
      className="ke-resource-yaml"
      direction="vertical"
      size={16}
      style={{ width: '100%' }}
    >
      <Space wrap>
        <Button
          icon={<DownloadOutlined aria-hidden="true" />}
          onClick={() => downloadText(`${type}-${name}.yaml`, yaml)}
        >
          下载 YAML
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined aria-hidden="true" />}
          loading={opening}
          disabled={
            !can('resource.update', namespace) ||
            type === 'event' ||
            (type === 'secret' && !reveal)
          }
          onClick={open}
        >
          编辑 YAML
        </Button>
        <Typography.Text type="secondary">
          {type === 'event'
            ? '事件由集群生成，仅供查看'
            : type === 'secret' && !reveal
            ? '先显示 Secret 值即可编辑'
            : '应用前校验并预览改动，自动保存版本记录'}
        </Typography.Text>
      </Space>
      {error && !editing && <Alert showIcon type="error" message={error} />}
      <YamlDisplay yamlText={yaml} title="当前资源 YAML" />
      <Card
        title="版本历史"
        extra={
          <Button
            icon={<ReloadOutlined aria-hidden="true" />}
            onClick={() => setRefresh((v) => v + 1)}
          >
            刷新版本
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          记录通过 KubeEngine 提交的 YAML 修改。版本按当前资源 UID
          区分；集群外部修改不会自动生成历史记录。
        </Typography.Paragraph>
        {historyError && <Alert showIcon type="error" message={historyError} />}
        <Table<Revision>
          size="small"
          rowKey="id"
          loading={historyLoading}
          dataSource={history}
          scroll={{ x: 850 }}
          locale={{ emptyText: '暂无 YAML 变更记录' }}
          pagination={{
            current: page,
            pageSize: 10,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
          columns={[
            {
              title: '版本',
              dataIndex: 'version',
              render: (v: number) => `v${v}`,
            },
            { title: '操作人', dataIndex: 'actor' },
            {
              title: '时间',
              dataIndex: 'createdAt',
              render: (v: string) => new Date(v).toLocaleString('zh-CN'),
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (v: string) => (
                <Tag color={statuses[v]?.color}>{statuses[v]?.text || v}</Tag>
              ),
            },
            { title: '说明', dataIndex: 'comment', ellipsis: true },
            {
              title: '改动',
              render: (_: unknown, row: Revision) =>
                `${row.changedPaths.length} 项`,
            },
            {
              title: '操作',
              render: (_: unknown, row: Revision) => (
                <Button
                  type="link"
                  loading={detailLoading === row.id}
                  onClick={() => detail(row)}
                >
                  查看差异
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={`编辑 YAML · ${
          namespace === '_cluster' ? '' : namespace + '/'
        }${name}`}
        open={editing}
        width={1100}
        onCancel={cancel}
        maskClosable={false}
        closable={!saving && !checking}
        keyboard={!saving && !checking}
        footer={
          <Space>
            <Button disabled={saving || checking} onClick={cancel}>
              取消
            </Button>
            <Button
              type="primary"
              loading={checking}
              disabled={saving || !base || !draft.trim()}
              onClick={check}
            >
              校验并预览差异
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message="仅修改当前资源配置；不可变字段由 Kubernetes 校验。其他人或控制器修改资源后需重新载入并合并。"
        />
        {error && <Alert type="error" showIcon message={error} />}
        <Typography.Paragraph type="secondary">
          基于 resourceVersion：{base?.resourceVersion}
        </Typography.Paragraph>
        <Input.TextArea
          aria-label="资源 YAML 编辑器"
          className="ke-yaml-editor"
          value={draft}
          spellCheck={false}
          disabled={saving || checking}
          autoSize={{ minRows: 18, maxRows: 32 }}
          onChange={(e) => {
            setDraft(e.target.value);
            setPreview(undefined);
          }}
        />
        <Typography.Paragraph style={{ marginTop: 16 }}>
          变更说明（可选）
        </Typography.Paragraph>
        <Input
          aria-label="变更说明"
          value={comment}
          maxLength={500}
          showCount
          disabled={saving || checking}
          placeholder="例如：调整副本数为 3"
          onChange={(e) => {
            setComment(e.target.value);
            setPreview(undefined);
          }}
        />
      </Modal>
      <Modal
        title={`确认应用 · ${preview?.changes.length || 0} 项改动`}
        open={!!preview}
        width={1100}
        onCancel={() => {
          if (!saving) setPreview(undefined);
        }}
        onOk={apply}
        okText="确认应用到集群"
        confirmLoading={saving}
        cancelText="返回编辑"
        closable={!saving}
        maskClosable={false}
        keyboard={!saving}
        cancelButtonProps={{ disabled: saving }}
      >
        <Alert
          type="warning"
          showIcon
          message={`将立即更新 ${namespace}/${name}，可能引起工作负载重建或服务行为变化。`}
        />
        <Diff changes={preview?.changes || []} />
      </Modal>
      <Drawer
        rootClassName="ke-yaml-history"
        title={`版本 v${selected?.version || ''} · 变更详情`}
        open={!!selected}
        width={1000}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <>
            <Descriptions
              size="small"
              column={1}
              items={[
                { key: 'actor', label: '操作人', children: selected.actor },
                {
                  key: 'comment',
                  label: '变更说明',
                  children: selected.comment || '—',
                },
                {
                  key: 'rv',
                  label: 'resourceVersion',
                  children: `${selected.beforeResourceVersion} → ${
                    selected.afterResourceVersion || '尚未确认'
                  }`,
                },
                {
                  key: 'status',
                  label: '状态',
                  children: statuses[selected.status]?.text || selected.status,
                },
              ]}
            />
            {selected.error && (
              <Alert showIcon type="warning" message={selected.error} />
            )}
            {selected.redacted && (
              <Alert
                showIcon
                type="info"
                message="Secret 值已隐藏，字段仍保留改动标识。"
              />
            )}
            <Tabs
              items={[
                {
                  key: 'diff',
                  label: '改动项',
                  children: <Diff changes={selected.changes || []} />,
                },
                {
                  key: 'before',
                  label: '修改前',
                  children: (
                    <YamlDisplay yamlText={selected.beforeYaml || ''} />
                  ),
                },
                {
                  key: 'after',
                  label: selected.status === 'applied' ? '修改后' : '预期配置',
                  children: <YamlDisplay yamlText={selected.afterYaml || ''} />,
                },
                {
                  key: 'request',
                  label: '提交内容',
                  children: (
                    <YamlDisplay yamlText={selected.requestedYaml || ''} />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </Space>
  );
};
export default ResourceYaml;
