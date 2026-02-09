// import { Footer } from '@/components';
import { DEFAULT_NAME } from '@/constants';
import service from '@/services';
import { saveToken } from '@/utils/auth';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, history, useModel } from '@umijs/max';
import { Alert, message, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
const { login } = service.UserController;
const useStyles = createStyles(({ token }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage: "url('/assets/bg.png')",
      backgroundSize: '100% 100%',
    },
  };
});
const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};
const Login: React.FC = () => {
  const [type, setType] = useState<string>('account');
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  // 登录提交
  const handleLogin = async (values: { username: any; password: any }) => {
    const data = await login({ ...values });
    // 保存 Token 到本地
    saveToken({
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresAt: data.expires_at,
      username: values.username,
    });

    // 更新全局初始状态
    initialState
      ? setInitialState({
          ...initialState,
          user: {
            ...initialState.user,
            accessToken: data.access_token,
            tokenExpiresAt: data.expires_at,
            authType: 'token',
          },
        })
      : setInitialState({
          avatar: '/assets/logo.png',
          user: {
            accessToken: data.access_token,
            tokenExpiresAt: data.expires_at,
            authType: 'token',
            ak: '',
          },
        });
    message.success('登录成功！');
    // 跳转首页
    history.push('/');
  };
  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {'登录'}- {DEFAULT_NAME}
        </title>
      </Helmet>
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/assets/logo.png" />}
          title={DEFAULT_NAME}
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values: any) => {
            await handleLogin(values);
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'account',
                label: '账户密码登录',
              },
            ]}
          />
          {type === 'account' && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder="用户名"
                rules={[
                  {
                    required: true,
                    message: '请输入用户名!',
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder="密码"
                rules={[
                  {
                    required: true,
                    message: '请输入密码！',
                  },
                ]}
              />
            </>
          )}
        </LoginForm>
      </div>
      {/* <Footer /> */}
    </div>
  );
};
export default Login;
