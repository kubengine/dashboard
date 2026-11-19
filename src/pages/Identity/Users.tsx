import PageHeading from '@/components/PageHeading';
import * as service from '@/services/IdentityController';
import {
  ConsoleUser,
  Role,
  roleLabels,
  sensitiveOptions,
} from '@/services/IdentityController';
import { browse } from '@/services/KubernetesController';
import { usePermissions } from '@/utils/permissions';
import { getRequestErrorMessage, isSuccessCode } from '@/utils/request';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({
  value,
  label,
}));
export default function Users() {
  const { admin } = usePermissions();
  const [rows, setRows] = useState<ConsoleUser[]>([]);
  const [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [editing, setEditing] = useState<ConsoleUser | 'new'>(),
    [reset, setReset] = useState<ConsoleUser>();
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [namespaceLoading, setNamespaceLoading] = useState(false);
  const [namespaceError, setNamespaceError] = useState('');
  const [namespaceRefresh, setNamespaceRefresh] = useState(0);
  const [form] = Form.useForm(),
    [passwordForm] = Form.useForm();
  const role = Form.useWatch('role', form) as Role;
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await service.list_users(page, size);
      setRows(data.items);
      setTotal(data.total);
    } catch (error) {
      setError(getRequestErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (admin) void load();
  }, [admin, page, size]);
  useEffect(() => {
    if (!admin || !editing) return;
    const controller = new AbortController();
    setNamespaceLoading(true);
    setNamespaceError('');
    setNamespaces([]);
    (async () => {
      const names: string[] = [];
      for (let page = 1; ; page++) {
        const result = await browse(
          'namespace',
          { page, page_size: 100, sort_by: 'a,name' },
          controller.signal,
        );
        if (!isSuccessCode(result.code))
          throw new Error(result.message || '命名空间读取失败');
        const batch = result.data.namespaces.map(
          (row: { objectMeta: { name: string } }) => row.objectMeta.name,
        );
        names.push(...batch);
        if (names.length >= result.data.listMeta.totalItems || !batch.length)
          break;
      }
      if (!controller.signal.aborted) setNamespaces([...new Set(names)]);
    })()
      .catch((error) => {
        if (!controller.signal.aborted)
          setNamespaceError(getRequestErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setNamespaceLoading(false);
      });
    return () => controller.abort();
  }, [admin, editing, namespaceRefresh]);
  const open = (user: ConsoleUser | 'new') => {
    setError('');
    form.resetFields();
    setEditing(user);
    form.setFieldsValue(
      user === 'new'
        ? {
            role: 'readonly',
            enabled: true,
            namespaces: [],
            sensitive_permissions: [],
          }
        : user,
    );
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError('');
      const data = {
        role: values.role,
        namespaces: values.namespaces || [],
        sensitive_permissions: values.sensitive_permissions || [],
      };
      if (editing === 'new')
        await service.create_user({
          ...data,
          username: values.username,
          password: values.password,
        });
      else if (editing)
        await service.update_user(editing.user_id, {
          ...data,
          enabled: values.enabled,
          revision: editing.revision,
        });
      setEditing(undefined);
      message.success('用户配置已保存');
      window.dispatchEvent(new Event('kubengine:permissions-stale'));
      await load();
    } catch (error: any) {
      if (!error.errorFields) setError(getRequestErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  if (!admin) return <Alert type="warning" message="需要平台管理员权限" />;
  return (
    <>
      <PageHeading
        eyebrow="IDENTITY & ACCESS"
        title="用户与授权"
        description="管理控制台用户、命名空间范围与敏感操作权限。"
        extra={
          <Space>
            <Button onClick={() => void load()}>刷新</Button>
            <Button type="primary" onClick={() => open('new')}>
              创建用户
            </Button>
          </Space>
        }
      />
      {error && !editing && !reset && (
        <Alert role="alert" type="error" showIcon message={error} />
      )}
      <Card>
        <Table
          rowKey="user_id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 900 }}
          columns={[
            { title: '用户名', dataIndex: 'username' },
            {
              title: '角色',
              dataIndex: 'role',
              render: (role: Role) => roleLabels[role],
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (enabled: boolean) => (
                <Tag color={enabled ? 'green' : 'default'}>
                  {enabled ? '启用' : '停用'}
                </Tag>
              ),
            },
            {
              title: '命名空间',
              render: (_, user) =>
                user.role === 'platform_admin'
                  ? '全部命名空间'
                  : user.namespaces.join('、') || '未授权',
            },
            {
              title: '敏感权限',
              render: (_, user) =>
                user.role === 'platform_admin'
                  ? '全部'
                  : user.sensitive_permissions
                      .map(
                        (p) =>
                          sensitiveOptions.find((o) => o.value === p)?.label,
                      )
                      .join('、') || '无',
            },
            {
              title: '操作',
              render: (_, user) => (
                <Space>
                  <Button type="link" onClick={() => open(user)}>
                    配置授权与状态
                  </Button>
                  <Button
                    type="link"
                    onClick={() => {
                      setReset(user);
                      setError('');
                      passwordForm.resetFields();
                    }}
                  >
                    重置密码
                  </Button>
                </Space>
              ),
            },
          ]}
          pagination={{
            current: page,
            pageSize: size,
            total,
            showSizeChanger: true,
            onChange: (page, size) => {
              setPage(page);
              setSize(size);
            },
          }}
        />
      </Card>
      <Drawer
        title={
          editing === 'new'
            ? '创建用户'
            : `配置用户：${editing?.username || ''}`
        }
        open={!!editing}
        onClose={() => !saving && setEditing(undefined)}
        width={560}
        extra={
          <Button loading={saving} type="primary" onClick={() => void save()}>
            保存
          </Button>
        }
      >
        {error && (
          <Alert
            role="alert"
            showIcon
            type="error"
            message={error}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={save} scrollToFirstError>
          {editing === 'new' && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true },
                  {
                    pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/,
                    message: '使用字母、数字、点、下划线或连字符，最多 64 字符',
                  },
                ]}
              >
                <Input autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="password"
                label="初始密码"
                rules={[
                  { required: true },
                  { min: 12, message: '密码至少 12 字符' },
                ]}
                extra="UTF-8 编码最多 72 字节"
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </>
          )}
          {editing !== 'new' && (
            <Form.Item name="enabled" label="账户状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
          <Form.Item name="role" label="内置角色" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item
            name="namespaces"
            label="授权命名空间"
            extra={
              <>
                <div>
                  可选择现有命名空间，或输入名称后按回车添加；不支持通配符。管理员拥有全集群访问权限。
                </div>
                {namespaceError && (
                  <Alert
                    role="alert"
                    type="warning"
                    showIcon
                    message="命名空间列表读取失败"
                    description={namespaceError}
                    action={
                      <Button
                        size="small"
                        onClick={() =>
                          setNamespaceRefresh((value) => value + 1)
                        }
                      >
                        重试
                      </Button>
                    }
                  />
                )}
              </>
            }
            rules={[
              {
                validator: (_, values: string[]) =>
                  !values?.some(
                    (v) => !/^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/.test(v),
                  )
                    ? Promise.resolve()
                    : Promise.reject(new Error('命名空间名称格式无效')),
              },
            ]}
          >
            <Select
              mode="tags"
              loading={namespaceLoading}
              options={namespaces.map((name) => ({ value: name, label: name }))}
              optionFilterProp="label"
              notFoundContent={
                namespaceLoading
                  ? '正在加载命名空间…'
                  : '暂无可选命名空间，可输入名称后按回车添加'
              }
              tokenSeparators={[',', ' ']}
              disabled={role === 'platform_admin'}
              placeholder="选择命名空间，或输入名称后按回车添加"
            />
          </Form.Item>
          <Form.Item
            name="sensitive_permissions"
            label="独立敏感权限"
            extra="敏感权限只在授权命名空间内生效。终端与文件修改即使授予只读角色，也可能改变容器。"
          >
            <Checkbox.Group
              options={sensitiveOptions}
              disabled={role === 'platform_admin'}
            />
          </Form.Item>
          <Alert
            showIcon
            type="info"
            message="停用和改密会撤销所有会话；角色与授权调整在下一次请求生效。必须保留至少一个启用的管理员。"
          />
        </Form>
      </Drawer>
      <Modal
        title={`重置密码：${reset?.username || ''}`}
        open={!!reset}
        confirmLoading={saving}
        onCancel={() => !saving && setReset(undefined)}
        onOk={async () => {
          try {
            const values = await passwordForm.validateFields();
            setSaving(true);
            await service.reset_password(reset!.user_id, values.password);
            setReset(undefined);
            message.success('密码已重置，原会话已撤销');
          } catch (error: any) {
            if (!error.errorFields) setError(getRequestErrorMessage(error));
          } finally {
            setSaving(false);
          }
        }}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true },
              { min: 12, message: '密码至少 12 字符' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
        {error && <Alert role="alert" type="error" message={error} />}
      </Modal>
    </>
  );
}
