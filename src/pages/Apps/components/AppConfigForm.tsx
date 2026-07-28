import services from '@/services';
import { App, AppFieldConfig } from '@/services/AppController';
import { ProCard } from '@ant-design/pro-components';
import { Button, Divider, Form, Space } from 'antd';
import { useEffect, useState } from 'react';
import DynamicForm from './DynamicForm';

interface AppConfigFormProps {
  app: App;
  submit?: (val: any) => void;
}

export const AppConfigForm: React.FC<AppConfigFormProps> = ({
  app,
  submit,
}) => {
  const [collapseds, setCollapseds] = useState<Record<string, boolean>>({
    basic: false,
    cluster: false,
    env: false,
  });
  const [basicForm] = Form.useForm<any>();
  const [clusterForm] = Form.useForm<any>();
  const [envForm] = Form.useForm<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [versionOptions, setVersionOptions] =
    useState<{ label: string; value: string }[]>();

  const handleSubmit = async () => {
    const [basic, cluster, env] = await Promise.all([
      basicForm.validateFields().catch((error) => {
        return Promise.reject({ form: 'basic', error });
      }),
      clusterForm
        .validateFields()
        .catch((error) => Promise.reject({ form: 'cluster', error })),
      envForm
        .validateFields()
        .catch((error) => Promise.reject({ form: 'env', error })),
    ]).catch((e) => {
      throw e;
    });
    setLoading(true);
    const data = {
      ...basic,
      ...cluster,
      ...env,
    };
    if (submit) {
      submit(data);
    }
    setLoading(false);
  };
  const fetchArtifacts = async (current = 1, pageSize = 100) => {
    const { code, data } = await services.ArtifactsController.get_artifacts(
      'charts',
      encodeURIComponent(encodeURIComponent(app.helm_chart)),
      '',
      pageSize,
      current,
    );
    if (code == 200) {
      const options = data
        .filter(
          (item: {
            extra_attrs: { appVersion: any; version: any };
            digest: any;
          }) => {
            // 过滤：确保extra_attrs、appVersion、version、digest都存在，避免空值
            return (
              item?.extra_attrs?.appVersion &&
              item?.extra_attrs?.version &&
              item?.digest
            );
          },
        )
        .map(
          (item: {
            extra_attrs: { appVersion: any; version: any };
            digest: any;
          }) => ({
            label: `${item.extra_attrs.version} (appVersion:${item.extra_attrs.appVersion})`,
            value: item.extra_attrs.version,
          }),
        );
      if (options.length > 0) {
        setVersionOptions(options);
      }
    }
  };
  useEffect(() => {
    // 获取version
    if (app.helm_chart && app.helm_chart != '') {
      fetchArtifacts();
    }
  }, [app]);

  // app 异步加载后同步基础字段值（Ant Design initialValue 仅首次挂载生效）
  useEffect(() => {
    if (app.app_id) {
      basicForm.setFieldsValue({ name: app.name, helm_chart: app.helm_chart });
    }
  }, [app, basicForm]);

  const basicFields: AppFieldConfig[] = [
    {
      name: 'app_id',
      label: 'app_id',
      type: 'text',
      initial_value: app.app_id,
      config_type: '',
      extra: '',
      order: 0,
      form_item_props: {
        hidden: true,
      },
      rules: [],
      field_props: {},
    },
    {
      name: 'helm_chart',
      label: 'helm_chart',
      type: 'text',
      initial_value: app.helm_chart,
      config_type: '',
      extra: '',
      order: 1,
      form_item_props: {
        hidden: true,
      },
      rules: [],
      field_props: {},
    },
    {
      name: 'name',
      label: 'name',
      type: 'text',
      initial_value: app.name,
      extra: '应用服务的名称',
      order: 2,
      config_type: '',
      form_item_props: { required: true },
      rules: [
        { required: true, message: '请输入应用名称' },
        { min: 2, message: '应用名至少2个字符' },
      ],
      field_props: {},
    },
    {
      name: 'helm_chart_version',
      label: 'version',
      type: 'select',
      order: 3,
      extra: '选择部署使用的helm模板版本',
      config_type: '',
      initial_value: '',
      rules: [{ required: true, message: '请选择部署使用的helm模板版本' }],
      field_props: { options: versionOptions },
      form_item_props: { required: true },
    },
  ];
  return (
    <>
      <ProCard
        loading={loading}
        title="第 1 步: 基本设置"
        extra={
          <a
            onClick={() =>
              setCollapseds((prev) => ({ ...prev, basic: !prev.basic }))
            }
          >
            {collapseds.basic ? '展开配置' : '收起配置'}
          </a>
        }
        style={{ marginBlockStart: 16 }}
        headerBordered
        collapsed={collapseds.basic}
      >
        <DynamicForm
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          style={{ maxWidth: 700 }}
          form={basicForm}
          fields={basicFields}
        />
      </ProCard>
      <ProCard
        title="第 2 步: 集群规格"
        loading={loading}
        extra={
          <a
            onClick={() =>
              setCollapseds((prev) => ({ ...prev, cluster: !prev.cluster }))
            }
          >
            {collapseds.cluster ? '展开配置' : '收起配置'}
          </a>
        }
        style={{ marginBlockStart: 16 }}
        headerBordered
        collapsed={collapseds.cluster}
      >
        <DynamicForm
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          form={clusterForm}
          style={{ maxWidth: 700 }}
          fields={(
            app.app_field_configs.filter(
              (item) => item.config_type == 'cluster',
            ) || []
          ).sort((a: AppFieldConfig, b: AppFieldConfig) => {
            return a.order - b.order;
          })}
        />
      </ProCard>
      <ProCard
        title="第 3 步: 服务环境参数设置"
        loading={loading}
        extra={
          <a
            onClick={() =>
              setCollapseds((prev) => ({ ...prev, env: !prev.env }))
            }
          >
            {collapseds.env ? '展开配置' : '收起配置'}
          </a>
        }
        style={{ marginBlockStart: 16 }}
        headerBordered
        collapsed={collapseds.env}
      >
        <DynamicForm
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          form={envForm}
          style={{ maxWidth: 700 }}
          fields={(
            app.app_field_configs.filter((item) => item.config_type == 'env') ||
            []
          ).sort((a: AppFieldConfig, b: AppFieldConfig) => {
            return a.order - b.order;
          })}
        />
      </ProCard>

      {submit ? (
        <>
          <Divider />
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={loading}
            >
              提交
            </Button>
            <Button size="large">取消</Button>
          </Space>
        </>
      ) : (
        <></>
      )}
    </>
  );
};
