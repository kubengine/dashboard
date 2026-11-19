import Brand from '@/components/Brand';
import service from '@/services';
import { current_user } from '@/services/IdentityController';
import { saveToken } from '@/utils/auth';
import { getRequestErrorMessage } from '@/utils/request';
import {
  ArrowRightOutlined,
  CheckOutlined,
  DeploymentUnitOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Helmet, history, useModel } from '@umijs/max';
import { Alert, Button, Form, Input } from 'antd';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import './index.less';

const Login: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    setError('');
    try {
      const data = await service.UserController.login(values);
      const store = saveToken({
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresAt: data.expires_at,
        username: values.username,
      });
      const currentUser = await current_user();
      // Publish permissions before Umi mounts and evaluates the target route.
      flushSync(() => {
        setInitialState((previous) => ({
          ...previous,
          currentUser,
          avatar: '/assets/kubeengine-mark.svg',
          user: {
            accessToken: data.access_token,
            tokenExpiresAt: store.token.expiresAt,
            authType: 'token',
          },
        }));
      });
      history.push(
        currentUser.role === 'platform_admin' ? '/home' : '/resources/pod',
      );
    } catch (error) {
      setError(getRequestErrorMessage(error, '登录失败，请重试'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="ke-login">
      <Helmet>
        <title>登录 · KubeEngine</title>
      </Helmet>
      <section
        className="ke-login-story"
        aria-label="KubeEngine 容器云管理平台"
      >
        <Brand light />
        <div className="ke-login-intro">
          <div className="ke-login-kicker">基础设施 · 应用 · 一站管理</div>
          <h1>
            让每一次部署，
            <br />
            从容有序。
          </h1>
          <p>
            连接集群、制品与应用，
            <br />
            构建清晰、高效的云原生工作空间。
          </p>
          <div className="ke-topology" aria-hidden="true">
            <div className="ke-topology-core">
              <img src="/assets/kubeengine-mark.svg" alt="" />
              <span>KubeEngine</span>
            </div>
            <div className="ke-topology-line" />
            <div className="ke-topology-nodes">
              {['集群资源', '制品仓库', '应用服务'].map((label) => (
                <div key={label}>
                  <DeploymentUnitOutlined aria-hidden="true" />
                  <span>{label}</span>
                  <i />
                </div>
              ))}
            </div>
          </div>
          <div className="ke-login-features">
            <span>
              <CheckOutlined aria-hidden="true" />
              离线环境部署
            </span>
            <span>
              <CheckOutlined aria-hidden="true" />
              统一资源管理
            </span>
            <span>
              <CheckOutlined aria-hidden="true" />
              应用生命周期
            </span>
          </div>
        </div>
        <div className="ke-login-story-footer">
          KUBEENGINE <span>以简驭繁，专注交付。</span>
        </div>
      </section>
      <section className="ke-login-panel">
        <div className="ke-login-mobile-brand">
          <Brand />
        </div>
        <div className="ke-login-form">
          <div className="ke-eyebrow">WELCOME TO KUBEENGINE</div>
          <h2>欢迎回来</h2>
          <p>登录控制台，开始管理您的工作空间。</p>
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              role="alert"
              style={{ marginBottom: 20 }}
            />
          )}
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={handleLogin}
            size="large"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, whitespace: true, message: '请输入用户名' },
              ]}
            >
              <Input
                prefix={<UserOutlined aria-hidden="true" />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined aria-hidden="true" />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录控制台 <ArrowRightOutlined aria-hidden="true" />
            </Button>
          </Form>
          <div className="ke-login-security">
            <SafetyCertificateOutlined aria-hidden="true" />
            账户由平台管理员统一管理
          </div>
        </div>
        <footer className="ke-login-footer">KubeEngine 容器云管理平台</footer>
      </section>
    </div>
  );
};
export default Login;
