import services from '@/services';
import { App } from '@/services/AppController';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';
import { AppConfigForm } from './components/AppConfigForm';

const Deploy: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const params = useParams<Record<string, any>>();
  const app_id = params.app_id;
  const [app, setApp] = useState<App>({
    name: '',
    category: [],
    description: '',
    helm_chart: '',
    app_field_configs: [],
  });
  const getConfig = async () => {
    setLoading(true);
    const { code, data } = await services.AppsController.get_app_by_id(app_id);
    if (code == 200) {
      setApp(data);
    }
    setLoading(false);
  };
  useEffect(() => {
    getConfig();
  }, [app_id]);

  const deploy = async (val: any) => {
    const { code } = await services.AppsController.deploy(val);
    if (code == 200) {
      message.success('提交部署请求成功');
      history.push('/apps/cluster');
    }
  };
  return (
    <PageContainer loading={loading}>
      <AppConfigForm
        app={app}
        submit={(val) => {
          const { helm_chart, name, helm_chart_version, app_id, ...data } = val;
          deploy({
            app_id,
            helm_chart,
            name,
            helm_chart_version,
            config: data,
          });
        }}
      />
    </PageContainer>
  );
};

export default Deploy;
