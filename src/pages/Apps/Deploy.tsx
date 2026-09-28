import services from '@/services';
import { App } from '@/services/AppController';
import { deploymentSubmission } from '@/utils/deploymentSubmission';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
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
    if (code === 200) {
      setApp(data);
    }
    setLoading(false);
  };
  useEffect(() => {
    getConfig();
  }, [app_id]);

  const inFlight = useRef<Promise<void> | null>(null);
  const submitted = useRef(false);
  const deploy = (val: any): Promise<void> => {
    if (submitted.current) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    const submission = deploymentSubmission(val);
    const pending = services.AppsController.deploy(val, submission.key)
      .then(({ code }) => {
        if (code === 200) {
          submitted.current = true;
          submission.complete();
          message.success('提交部署请求成功');
          history.push('/apps/cluster');
        }
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = pending;
    return pending;
  };
  return (
    <PageContainer loading={loading}>
      <AppConfigForm
        app={app}
        submit={(val) => {
          const { helm_chart, name, helm_chart_version, app_id, ...data } = val;
          return deploy({
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
