import { login } from '@/services/UserController';
import { saveToken } from '@/utils/auth';
import { history, useModel } from '@umijs/max';
import { Modal } from 'antd';
import React, { useEffect } from 'react';
const PasswordFree: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  // 登录提交
  const handleLogin = async () => {
    const values = { username: 'admin', password: 'Avic@123' };
    try {
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
      history.push('/');
    } catch (e) {
      Modal.error({
        title: '登录失败',
        content: '请手动关闭当前浏览器标签页',
        okButtonProps: { style: { display: 'none' } },
        cancelButtonProps: { style: { display: 'none' } },
        closable: false, // 移除右上角的 X 按钮
        keyboard: false, // 禁用 ESC 键关闭
        maskClosable: false,
      });
    }
  };
  useEffect(() => {
    handleLogin();
  }, []);

  return <> </>;
};

export default PasswordFree;
