import PageHeading from '@/components/PageHeading';
import {
  change_password,
  roleLabels,
  sensitiveOptions,
} from '@/services/IdentityController';
import { clearAuthStore } from '@/utils/auth';
import { usePermissions } from '@/utils/permissions';
import { getRequestErrorMessage } from '@/utils/request';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Space,
} from 'antd';
import { useState } from 'react';

export default function Profile() {
  const { user, admin } = usePermissions();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <PageHeading
        eyebrow="MY ACCOUNT"
        title="我的账户"
        description="查看有效授权并管理登录密码。"
      />
      <Card title="当前权限">
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'username', label: '用户名', children: user?.username },
            {
              key: 'role',
              label: '角色',
              children: user && roleLabels[user.role],
            },
            {
              key: 'namespaces',
              label: '命名空间',
              children: admin
                ? '全部命名空间'
                : user?.namespaces.join('、') || '未授权',
            },
            {
              key: 'sensitive',
              label: '敏感权限',
              children: admin
                ? '全部'
                : user?.sensitive_permissions
                    .map(
                      (p) => sensitiveOptions.find((o) => o.value === p)?.label,
                    )
                    .join('、') || '无',
            },
          ]}
        />
        <Button
          onClick={() =>
            window.dispatchEvent(new Event('kubengine:permissions-stale'))
          }
        >
          刷新权限
        </Button>
      </Card>
      <Card title="修改密码" style={{ maxWidth: 640 }}>
        {error && <Alert role="alert" type="error" showIcon message={error} />}
        <Form
          form={form}
          layout="vertical"
          scrollToFirstError
          onFinish={async (values) => {
            setSaving(true);
            setError('');
            try {
              await change_password({
                current_password: values.current_password,
                password: values.password,
              });
              clearAuthStore();
              message.success('密码已修改，请重新登录');
              history.replace('/user/login');
            } catch (error) {
              setError(getRequestErrorMessage(error));
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item
            name="current_password"
            label="当前密码"
            rules={[{ required: true }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true },
              { min: 12, message: '密码至少 12 字符' },
            ]}
            extra="UTF-8 编码最多 72 字节"
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value === getFieldValue('password')
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入的密码不一致')),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button htmlType="submit" type="primary" loading={saving}>
            修改密码并重新登录
          </Button>
        </Form>
      </Card>
    </Space>
  );
}
