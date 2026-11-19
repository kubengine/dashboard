import { current_user } from '@/services/IdentityController';
import { getBearerToken } from '@/utils/auth';
import { getRequestErrorMessage } from '@/utils/request';
import { history, useLocation, useModel } from '@umijs/max';
import { Alert, Button, Spin } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

export default function AuthorizationBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { pathname } = useLocation();
  const [error, setError] = useState('');
  const busy = useRef(false);
  const refresh = async () => {
    if (busy.current || !getBearerToken()) return;
    busy.current = true;
    const bearer = getBearerToken();
    try {
      const user = await current_user();
      if (bearer === getBearerToken()) {
        setInitialState((previous) =>
          previous ? { ...previous, currentUser: user } : previous,
        );
        setError('');
      }
    } catch (error) {
      setError(getRequestErrorMessage(error, '无法读取当前权限'));
    } finally {
      busy.current = false;
    }
  };
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('kubengine:permissions-stale', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('kubengine:permissions-stale', refresh);
    };
  }, []);
  const user = initialState?.currentUser;
  const adminRoute = /^\/(home|nodeDetail|apps|artifacts|admin)(\/|$)/.test(
    pathname,
  );
  useEffect(() => {
    if (user && user.role !== 'platform_admin' && adminRoute)
      history.replace('/resources/pod');
  }, [user?.role, pathname]);
  if (error)
    return (
      <Alert
        showIcon
        type="error"
        message={error}
        action={<Button onClick={() => void refresh()}>重试</Button>}
      />
    );
  if (!user || (adminRoute && user.role !== 'platform_admin'))
    return (
      <Spin tip="正在核对访问权限">
        <div style={{ minHeight: 120 }} />
      </Spin>
    );
  return <>{children}</>;
}
