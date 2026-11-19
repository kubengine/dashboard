import PageHeading from '@/components/PageHeading';
import { browse } from '@/services/KubernetesController';
import { getRequestErrorMessage, isSuccessCode } from '@/utils/request';
import { getRelativeTime } from '@/utils/time';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { history, Link, useParams, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import React, { useEffect, useState } from 'react';
import {
  catalog,
  cpu,
  groups,
  memory,
  resourcePath,
  ResourceRow,
  Status,
  statusText,
  summary,
} from './catalog';
import { eventColumns } from './Events';
import './resources.less';

const Resources: React.FC = () => {
  const { type = 'pod' } = useParams();
  const [params, setParams] = useSearchParams();
  const entry = catalog.find((item) => item.kind === type);
  const namespace = params.get('namespace') || '';
  const name = params.get('name') || '';
  const label = params.get('label_selector') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(params.get('page_size')) || 20),
  );
  const sort = params.get('sort_by') || 'd,creationTimestamp';
  const field = params.get('field_selector') || '';
  const [form] = Form.useForm();
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [namespaceError, setNamespaceError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [updated, setUpdated] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [auto, setAuto] = useState(false);
  const update = (values: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, String(value)) : next.delete(key),
    );
    setParams(next);
  };
  useEffect(() => {
    form.setFieldsValue({ name, label });
  }, [name, label, form]);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const items: string[] = [];
      for (let page = 1; ; page++) {
        const result = await browse(
          'namespace',
          { page, page_size: 100, sort_by: 'a,name' },
          controller.signal,
        );
        if (!isSuccessCode(result.code)) throw new Error('命名空间读取失败');
        const batch = result.data.namespaces.map(
          (row: ResourceRow) => row.objectMeta.name,
        );
        items.push(...batch);
        if (items.length >= result.data.listMeta.totalItems || !batch.length)
          break;
      }
      if (!controller.signal.aborted) {
        setNamespaces(items);
        setNamespaceError(false);
      }
    })().catch(() => {
      if (!controller.signal.aborted) setNamespaceError(true);
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!entry) return;
    setLoading(true);
    setError('');
    setRows([]);
    setTotal(0);
    setWarnings([]);
    browse(
      type,
      {
        namespace: entry.cluster ? undefined : namespace || undefined,
        name: name || undefined,
        label_selector: label || undefined,
        field_selector: field || undefined,
        page,
        page_size: pageSize,
        sort_by: sort,
      },
      controller.signal,
    )
      .then(({ code, data, message }) => {
        if (controller.signal.aborted) return;
        if (!isSuccessCode(code)) throw new Error(message || '资源查询失败');
        setRows(data[entry.key] || []);
        setTotal(data.listMeta.totalItems);
        setWarnings([
          ...new Set<string>((data.errors || []).map((e: any) => e.message)),
        ]);
        setUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(getRequestErrorMessage(e, '资源读取失败，请重试。'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    type,
    namespace,
    name,
    label,
    field,
    page,
    pageSize,
    sort,
    refresh,
    entry,
  ]);
  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => setRefresh((v) => v + 1), 15000);
    return () => window.clearInterval(timer);
  }, [auto]);
  const navigate = (kind: string) => {
    const next = new URLSearchParams();
    if (namespace) next.set('namespace', namespace);
    history.push(`/resources/${kind}?${next}`);
  };
  if (!entry)
    return (
      <Alert
        type="error"
        message="不支持的资源类型"
        action={<Link to="/resources/pod">返回资源中心</Link>}
      />
    );
  const columns: any[] =
    type === 'event'
      ? eventColumns
      : [
          {
            title: '资源名称',
            width: 260,
            render: (_: unknown, row: ResourceRow) => (
              <Link
                className="ke-resource-name"
                to={resourcePath(
                  type,
                  row.objectMeta.namespace,
                  row.objectMeta.name,
                )}
              >
                {row.objectMeta.name}
              </Link>
            ),
          },
          ...(!entry.cluster
            ? [
                {
                  title: '命名空间',
                  dataIndex: ['objectMeta', 'namespace'],
                  width: 180,
                  render: (value: string) => (
                    <Button
                      type="link"
                      className="ke-resource-namespace"
                      onClick={() =>
                        update({ namespace: value, page: undefined })
                      }
                    >
                      {value}
                    </Button>
                  ),
                },
              ]
            : []),
          {
            title: '状态',
            width: 155,
            render: (_: unknown, row: ResourceRow) => (
              <Status value={statusText(type, row)} />
            ),
          },
          {
            title: '资源信息',
            width: 360,
            render: (_: unknown, row: ResourceRow) => (
              <div className="ke-resource-summary">{summary(type, row)}</div>
            ),
          },
          ...(type === 'pod'
            ? [
                {
                  title: 'CPU / 内存',
                  width: 170,
                  render: (_: unknown, row: ResourceRow) =>
                    `${cpu(row.metrics?.cpuUsage)} / ${memory(
                      row.metrics?.memoryUsage,
                    )}`,
                },
              ]
            : []),
          {
            title: '创建时间',
            width: 130,
            render: (_: unknown, row: ResourceRow) => (
              <Tooltip title={row.objectMeta.creationTimestamp}>
                {getRelativeTime(row.objectMeta.creationTimestamp || '')}
              </Tooltip>
            ),
          },
        ];
  return (
    <div className="ke-resources">
      <PageHeading
        eyebrow="RESOURCE EXPLORER"
        title="资源中心"
        description="查看整个 Kubernetes 集群的资源、依赖关系与运行状况。"
        extra={
          <Space>
            <span className="ke-resource-secondary">
              {updated && `更新于 ${updated}`}
            </span>
            <Button
              icon={<ReloadOutlined aria-hidden="true" />}
              loading={loading}
              onClick={() => setRefresh((v) => v + 1)}
            >
              刷新
            </Button>
          </Space>
        }
      />
      <Card className="ke-resource-workspace">
        <Tabs
          activeKey={entry.group}
          onChange={(key) =>
            navigate(catalog.find((item) => item.group === key)!.kind)
          }
          items={groups}
        />
        <div className="ke-resource-toolbar">
          <div>
            <label htmlFor="resource-kind">资源类型</label>
            <Select
              id="resource-kind"
              aria-label="资源类型"
              value={type}
              onChange={navigate}
              className="ke-kind-select"
              showSearch
              optionFilterProp="label"
              options={catalog
                .filter((item) => item.group === entry.group)
                .map((item) => ({ value: item.kind, label: item.title }))}
            />
          </div>
          <div>
            <label htmlFor="resource-namespace">命名空间</label>
            <Select
              id="resource-namespace"
              aria-label="命名空间"
              value={entry.cluster ? '' : namespace}
              disabled={entry.cluster}
              showSearch
              optionFilterProp="label"
              className="ke-namespace-select"
              onChange={(namespace) => update({ namespace, page: undefined })}
              options={[
                {
                  value: '',
                  label: entry.cluster ? '集群级资源' : '全部命名空间',
                },
                ...namespaces.map((value) => ({ value, label: value })),
              ]}
            />
          </div>
          <Space className="ke-resource-auto">
            <Switch
              checked={auto}
              onChange={setAuto}
              aria-label="每 15 秒刷新资源"
            />
            <span>15 秒刷新</span>
          </Space>
        </div>
        {namespaceError && (
          <Alert
            type="warning"
            showIcon
            message="命名空间列表读取失败，仍可查看全部命名空间资源。"
          />
        )}
        <Form
          form={form}
          layout="inline"
          className="ke-resource-filters"
          onFinish={({ name, label }) =>
            update({
              name: name?.trim(),
              label_selector: label?.trim(),
              page: undefined,
            })
          }
        >
          <Form.Item name="name">
            <Input
              aria-label="资源名称"
              prefix={<SearchOutlined aria-hidden="true" />}
              placeholder="搜索资源名称"
              allowClear
            />
          </Form.Item>
          <Form.Item name="label">
            <Input
              aria-label="标签选择器"
              placeholder="标签，如 app=nginx"
              allowClear
            />
          </Form.Item>
          <Button htmlType="submit" type="primary">
            查询
          </Button>
          <Button
            onClick={() => {
              form.resetFields();
              setParams(namespace ? { namespace } : {});
            }}
          >
            重置
          </Button>
          <Select
            aria-label="资源排序"
            value={sort}
            onChange={(sort_by) => update({ sort_by, page: undefined })}
            options={[
              { value: 'd,creationTimestamp', label: '最新创建优先' },
              { value: 'a,creationTimestamp', label: '最早创建优先' },
              { value: 'a,name', label: '名称升序' },
              { value: 'd,name', label: '名称降序' },
            ]}
          />
          {type === 'event' && (
            <Select
              aria-label="事件级别"
              value={field || ''}
              onChange={(field_selector) =>
                update({ field_selector, page: undefined })
              }
              options={[
                { value: '', label: '全部级别' },
                { value: 'type=Warning', label: '仅告警' },
                { value: 'type=Normal', label: '正常事件' },
              ]}
            />
          )}
        </Form>
        {field && type !== 'event' && (
          <Tag
            closable
            onClose={() =>
              update({ field_selector: undefined, page: undefined })
            }
          >
            字段筛选：{field}
          </Tag>
        )}
        {error && (
          <Alert
            showIcon
            type="error"
            message={error}
            action={
              <Button onClick={() => setRefresh((v) => v + 1)}>重试</Button>
            }
          />
        )}
        {warnings.length > 0 && (
          <Alert type="warning" showIcon message={warnings.join('；')} />
        )}
        <div className="ke-resource-list-heading">
          <h2>{entry.title}</h2>
          <span aria-live="polite">
            共 {total} 项{!entry.cluster && ` · ${namespace || '全部命名空间'}`}
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          rowKey={(row) =>
            row.objectMeta.uid ||
            `${row.objectMeta.namespace}/${row.objectMeta.name}`
          }
          scroll={{ x: type === 'pod' ? 1250 : 1100 }}
          size="middle"
          locale={{
            emptyText: error
              ? '资源读取失败'
              : '没有匹配的资源，请调整筛选条件。',
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 项`,
            onChange: (page, page_size) => update({ page, page_size }),
          }}
        />
      </Card>
    </div>
  );
};
export default Resources;
