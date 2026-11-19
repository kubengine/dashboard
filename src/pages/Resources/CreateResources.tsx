import YamlDisplay from '@/components/YamlDisplay';
import {
  create_resources,
  CreateResourceItem,
  CreateYamlPreview,
  CreateYamlResult,
  preview_create,
} from '@/services/ResourceYamlController';
import { ApiError, getRequestErrorMessage } from '@/utils/request';
import { UploadOutlined } from '@ant-design/icons';
import { Link } from '@umijs/max';
import {
  Alert,
  AutoComplete,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import React, { useRef, useState } from 'react';
import { parseAllDocuments } from 'yaml';
import { catalog, resourcePath } from './catalog';

const MAX_BYTES = 2 * 1024 ** 2;
const statuses = {
  validated: { color: 'success', text: '预检通过' },
  deferred: { color: 'warning', text: '等待新命名空间' },
  created: { color: 'success', text: '创建成功' },
  failed: { color: 'error', text: '失败' },
  unknown: { color: 'warning', text: '结果待核实' },
};
const example = `apiVersion: v1
kind: ConfigMap
metadata:
  name: example-config
data:
  greeting: hello
`;
const requestId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const CreateResources: React.FC<{
  namespace: string;
  namespaces: string[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ namespace, namespaces, onClose, onCreated }) => {
  const [draft, setDraft] = useState('');
  const [targetNamespace, setTargetNamespace] = useState(
    namespace || 'default',
  );
  const [comment, setComment] = useState('');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<CreateYamlPreview>();
  const [result, setResult] = useState<CreateYamlResult>();
  const attemptId = useRef('');
  const busy = checking || saving || importing;
  const locked = busy || !!result;
  const invalidate = () => {
    setPreview(undefined);
    setError('');
    attemptId.current = '';
  };
  const payload = () => ({
    yaml_text: draft,
    namespace: targetNamespace,
    comment,
  });
  const close = () => {
    if (busy) return;
    if (draft.trim() && !result) {
      Modal.confirm({
        title: '放弃本次资源创建？',
        content: 'YAML 尚未提交到集群。',
        okText: '放弃',
        cancelText: '继续编辑',
        onOk: onClose,
      });
    } else onClose();
  };
  const check = async () => {
    if (busy || result) return;
    setError('');
    setChecking(true);
    setPreview(undefined);
    try {
      if (!draft.trim()) throw new Error('请上传 YAML 文件或输入资源清单');
      if (new Blob([draft]).size > MAX_BYTES)
        throw new Error('YAML 文件最大 2 MiB');
      if (!targetNamespace.trim()) throw new Error('请填写默认命名空间');
      const documents = parseAllDocuments(draft, { uniqueKeys: true });
      if (documents.some((document) => document.errors.length))
        throw new Error('YAML 语法不正确，请检查缩进、重复字段和文档结构');
      const response = await preview_create(payload());
      setPreview(response.data);
      attemptId.current = requestId();
    } catch (error) {
      setError(getRequestErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };
  const create = async () => {
    if (!preview?.valid || !attemptId.current || locked) return;
    setSaving(true);
    setError('');
    try {
      const response = await create_resources({
        ...payload(),
        preview_token: preview.previewToken,
        request_id: attemptId.current,
      });
      setResult(response.data);
      if (response.data.created > 0) onCreated();
    } catch (error) {
      setError(getRequestErrorMessage(error));
      if (error instanceof ApiError && error.uncertain) {
        setResult({
          items: preview.items.map((item) => ({
            ...item,
            status: 'unknown',
            message: '提交结果待核实，请查看资源状态，勿重复创建',
          })),
          created: 0,
          total: preview.items.length,
          complete: false,
        });
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };
  const items = result?.items || preview?.items || [];
  return (
    <Modal
      open
      title="通过 YAML 创建资源"
      width={1080}
      className="ke-yaml-create"
      style={{ maxWidth: 'calc(100vw - 32px)' }}
      onCancel={close}
      closable={!busy}
      maskClosable={!busy}
      keyboard={!busy}
      footer={
        result ? (
          <Button type="primary" onClick={onClose}>
            完成
          </Button>
        ) : (
          <Space wrap>
            <Button onClick={close} disabled={busy}>
              取消
            </Button>
            <Button
              onClick={check}
              loading={checking}
              disabled={saving || importing}
            >
              集群预检
            </Button>
            <Button
              type="primary"
              onClick={create}
              loading={saving}
              disabled={!preview?.valid || checking || importing}
            >
              创建资源
            </Button>
          </Space>
        )
      }
    >
      <Alert
        type="info"
        showIcon
        message="上传 YAML 文件或粘贴清单，预检后创建资源。同名资源不会被覆盖。"
        description="支持使用 --- 分隔多个资源，也支持 Kubernetes List。每次最多 20 个资源、2 MiB。"
      />
      <Form layout="vertical" disabled={locked}>
        <div className="ke-yaml-create-options">
          <Form.Item label="默认命名空间" required>
            <AutoComplete
              value={targetNamespace}
              onChange={(value) => {
                setTargetNamespace(value);
                invalidate();
              }}
              aria-label="创建资源默认命名空间"
              options={[...new Set(['default', ...namespaces])].map(
                (value) => ({ value }),
              )}
              filterOption={(value, option) =>
                !!option?.value.toLowerCase().includes(value.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item label="创建说明">
            <Input
              value={comment}
              maxLength={500}
              placeholder="可选，记录到资源版本历史"
              onChange={(event) => {
                setComment(event.target.value);
                invalidate();
              }}
            />
          </Form.Item>
        </div>
        <Typography.Paragraph type="secondary">
          清单内的 metadata.namespace
          优先；集群级资源忽略默认命名空间。多资源创建逐项执行，失败不会撤销已经创建的资源。
        </Typography.Paragraph>
        <Space wrap className="ke-yaml-create-upload">
          <Upload
            accept=".yaml,.yml"
            showUploadList={false}
            disabled={locked}
            beforeUpload={async (file) => {
              if (locked) return Upload.LIST_IGNORE;
              setImporting(true);
              try {
                if (!/\.ya?ml$/i.test(file.name))
                  throw new Error('请选择 .yaml 或 .yml 文件');
                if (file.size > MAX_BYTES)
                  throw new Error('YAML 文件最大 2 MiB');
                const value = new TextDecoder('utf-8', { fatal: true }).decode(
                  await file.arrayBuffer(),
                );
                setDraft(value);
                setFilename(file.name);
                invalidate();
              } catch (error) {
                setError(
                  error instanceof TypeError
                    ? '文件须使用 UTF-8 编码'
                    : getRequestErrorMessage(error),
                );
              } finally {
                setImporting(false);
              }
              return Upload.LIST_IGNORE;
            }}
          >
            <Button icon={<UploadOutlined aria-hidden="true" />}>
              选择 YAML 文件
            </Button>
          </Upload>
          <Button
            disabled={locked}
            onClick={() => {
              setDraft(example);
              setFilename('');
              invalidate();
            }}
          >
            填入 ConfigMap 示例
          </Button>
          {filename && (
            <Typography.Text type="secondary">{filename}</Typography.Text>
          )}
        </Space>
        <Form.Item label="资源 YAML" required>
          <Input.TextArea
            value={draft}
            rows={15}
            spellCheck={false}
            readOnly={!!result}
            aria-label="待创建的资源 YAML"
            className="ke-yaml-editor"
            placeholder="apiVersion: v1 ..."
            onChange={(event) => {
              setDraft(event.target.value);
              setFilename('');
              invalidate();
            }}
          />
        </Form.Item>
      </Form>
      {error && <Alert showIcon type="error" message={error} />}
      {preview && !result && (
        <Alert
          showIcon
          type={
            preview.valid
              ? items.some((item) => item.status === 'deferred')
                ? 'warning'
                : 'success'
              : 'error'
          }
          message={
            preview.valid
              ? `共 ${items.length} 个资源可提交创建`
              : '预检未通过，请修改 YAML 后重新预检'
          }
          description={
            items.some((item) => item.status === 'deferred')
              ? '命名空间会优先创建，依赖资源在命名空间创建后再执行集群校验。'
              : '修改内容或默认命名空间后，需要重新预检。'
          }
        />
      )}
      {result && (
        <Alert
          showIcon
          type={result.complete ? 'success' : 'warning'}
          message={
            result.complete
              ? `成功创建 ${result.created} 个资源`
              : `本批 ${result.total} 个资源中 ${result.created} 个已确认创建成功`
          }
          description="请查看逐项结果。成功资源已保存初始版本；待核实的资源请先查看状态，避免重复提交。"
        />
      )}
      {!!items.length && (
        <Table<CreateResourceItem>
          size="small"
          rowKey="index"
          dataSource={items}
          pagination={false}
          scroll={{ x: 760 }}
          expandable={{
            rowExpandable: (row) => !!row.previewYaml,
            expandedRowRender: (row) => (
              <YamlDisplay yamlText={row.previewYaml || ''} />
            ),
          }}
          columns={[
            { title: '#', dataIndex: 'index', width: 45 },
            {
              title: '资源',
              render: (_, row) => (
                <>
                  <strong>
                    {row.kind} / {row.name}
                  </strong>
                  <div className="ke-resource-secondary">{row.apiVersion}</div>
                </>
              ),
            },
            {
              title: '命名空间',
              dataIndex: 'namespace',
              width: 145,
              render: (value) => value || '集群级',
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 145,
              render: (value: CreateResourceItem['status']) => (
                <Tag color={statuses[value].color}>{statuses[value].text}</Tag>
              ),
            },
            {
              title: '结果',
              render: (_, row) => (
                <Space direction="vertical" size={4}>
                  {row.message && <span>{row.message}</span>}
                  {row.version && row.status === 'created' && (
                    <span>已记录版本 v{row.version}</span>
                  )}
                  {result &&
                    row.status !== 'failed' &&
                    catalog.some(
                      (item) => item.kind === row.kind.toLowerCase(),
                    ) && (
                      <Link
                        to={resourcePath(
                          row.kind.toLowerCase(),
                          row.namespace,
                          row.name,
                        )}
                        onClick={onClose}
                      >
                        查看资源
                      </Link>
                    )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
};
export default CreateResources;
