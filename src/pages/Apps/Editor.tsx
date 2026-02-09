// src/pages/Apps/RegisterApp.tsx
import services from '@/services';
import {
  App,
  AppFieldConfig,
  get_init_field_config,
} from '@/services/AppController';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Form, message, Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import DynamicForm from './components/DynamicForm';
import { FieldConfigModal } from './components/FieldConfigModal';
import { FieldConfigTable } from './components/FieldConfigTable';
import { FieldHelmConfigModal } from './components/FieldHelmConfigModal';

const Editor: React.FC = () => {
  const params = useParams<Record<string, any>>();
  const app_id = params.app_id;
  const [visible, setVisible] = useState<boolean>(false);
  const [helmVisible, setHelmVisible] = useState<boolean>(false);
  const [basicForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [helmCharts, setHelmCharts] = useState<any[]>([]);
  const [selectedHelmChart, setSelectedHelmChart] = useState<string>('');
  const [formConfig, setFormConfig] = useState<App>({
    name: '',
    category: [],
    description: '',
    helm_chart: '',
    app_field_configs: [],
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'cluster' | 'env'>(
    'basic',
  );
  const [field, setField] = useState<AppFieldConfig>(get_init_field_config());
  const [searchText, setSearchText] = useState<string>('');

  const getAppConfig = async () => {
    const { code, data } = await services.AppsController.get_app_by_id(app_id);
    if (code == 200) {
      setSelectedHelmChart(data.helm_chart);
      setFormConfig(data);
      basicForm.setFieldsValue(data);
    } else {
      message.error('获取应用信息失败');
      history.push('/apps/config');
    }
  };
  // 获取Helm Chart列表
  const fetchHelmCharts = async () => {
    setLoading(true);
    const { code, data } = await services.ArtifactsController.get_repositories(
      'charts',
      searchText ? `name${encodeURIComponent('=')}~${searchText}` : '',
      10,
      1,
    );
    if (code == 200) {
      setHelmCharts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHelmCharts();
  }, [searchText]);

  useEffect(() => {
    if (app_id) {
      getAppConfig();
    }
  }, [app_id]);

  const handleRemoveField = (record: AppFieldConfig) => {
    const newFields = [...(formConfig.app_field_configs || [])];
    const targetIndex = newFields.findIndex(
      (item) => item.field_id == record.field_id,
    );
    newFields.splice(targetIndex, 1);
    setFormConfig((prev) => ({
      ...prev,
      app_field_configs: newFields,
    }));
  };

  const handleEditField = (field: AppFieldConfig) => {
    setField(field);
    setVisible(true);
  };

  const handleEditFieldHelm = (field: AppFieldConfig) => {
    setField(field);
    setHelmVisible(true);
  };
  const handleChangeOrder = (
    currentName: string,
    currentIndex: number,
    targetName: string,
    targetIndex: number,
  ) => {
    // 生成新的数据源（不可变操作，避免直接修改原数组）
    const newFields = [...(formConfig.app_field_configs || [])];
    const tIndex = newFields.findIndex((item) => item.name == currentName);
    if (tIndex !== -1) {
      newFields[tIndex] = {
        ...newFields[tIndex],
        order: targetIndex,
      };
    }
    const tIndex2 = newFields.findIndex((item) => item.name == targetName);
    if (tIndex2 !== -1) {
      newFields[tIndex2] = {
        ...newFields[tIndex2],
        order: currentIndex,
      };
    }
    setFormConfig((prev) => ({
      ...prev,
      app_field_configs: newFields,
    }));
  };

  const handleOnSaveField = (field: AppFieldConfig) => {
    let newFields = [...(formConfig.app_field_configs || [])];
    const targetIndex = newFields.findIndex((item) => item.name == field.name);
    if (targetIndex !== -1) {
      newFields[targetIndex] = {
        ...field,
        config_type: newFields[targetIndex].config_type,
        field_id: newFields[targetIndex].field_id,
      };
    } else {
      const activeFields: AppFieldConfig[] =
        formConfig.app_field_configs.filter(
          (item) => item.config_type == activeTab,
        );
      newFields.push({
        ...field,
        config_type: activeTab,
        order: activeFields.length,
      });
    }
    setFormConfig((prev) => ({
      ...prev,
      app_field_configs: newFields,
    }));
  };

  // 处理表单提交
  const handleSubmit = async () => {
    const formData = await basicForm.validateFields();
    setLoading(true);
    try {
      if (formConfig.app_field_configs.length == 0) {
        message.error('请补充集群配置、环境变量配置!');
        return;
      }

      // 转换表单数据为helm --set参数格式
      // const helmSetParams = formDataToHelmSet(formData, formConfig);

      // 准备提交的数据
      const appData = {
        ...formConfig,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        helm_chart: formData.helm_chart,
      };

      // 这里应该调用实际的API保存应用配置
      if (app_id) {
        // 编辑
        const { code, message: MSG } = await services.AppsController.update(
          appData,
        );
        if (code == 200) {
          message.success('保存配置成功');
        } else {
          message.error('保存配置失败');
        }
      } else {
        // 注册
        const { code, message: MSG } = await services.AppsController.add(
          appData,
        );
        if (code == 200) {
          message.success('应用注册成功');
          history.push('/apps/config');
        } else {
          message.error(MSG);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 基础信息字段配置
  const basicFields: AppFieldConfig[] = [
    {
      name: 'name',
      label: 'name',
      type: 'text',
      rules: [{ required: true, message: '请输入应用服务名称' }],
      config_type: '',
      extra: '应用服务的名称',
      order: 1,
      initial_value: '',
      form_item_props: { required: true },
      field_props: {
        placeholder: '请输入应用服务名称',
        allowClear: false,
      },
    },
    {
      name: 'description',
      label: '应用描述',
      type: 'textarea',
      config_type: '',
      extra: '',
      order: 2,
      initial_value: '',
      form_item_props: {},
      rules: [],
      field_props: {
        placeholder: '请输入应用描述',
        allowClear: true,
      },
    },
    {
      name: 'category',
      label: '应用分类',
      type: 'select',
      rules: [{ required: true, message: '请选择应用分类' }],
      config_type: '',
      extra: '应用分类，你可以通过输入自定义分类信息',
      order: 3,
      initial_value: [],
      form_item_props: { required: true },
      field_props: {
        placeholder: '请选择应用分类',
        allowClear: true,
        mode: 'tags',
        options: [
          { label: 'Web应用', value: 'Web应用' },
          { label: '数据库', value: '数据库' },
          { label: '中间件', value: '中间件' },
          { label: '工具', value: '工具' },
          { label: '其他', value: '其他' },
        ],
      },
    },
    {
      name: 'helm_chart',
      label: 'Helm模板',
      type: 'select',
      rules: [{ required: true, message: '请选择Helm模板' }],
      config_type: '',
      extra: '设置关联helm chart模板，用于应用部署时使用。',
      order: 3,
      initial_value: '',
      form_item_props: { required: true },
      field_props: {
        placeholder: '请选择Helm模板',
        allowClear: true,
        options: helmCharts.map((chart) => ({
          label: chart.name.replace('charts/', ''),
          value: chart.name.replace('charts/', ''),
        })),
        showSearch: true,
        onSearch: (val: any) => setSearchText(val),
        onChange: (val: string) => setSelectedHelmChart(val),
      },
    },
  ];

  return (
    <PageContainer loading={loading}>
      <Card>
        <Form layout="vertical">
          <Tabs
            activeKey={activeTab}
            onChange={(activeKey) => {
              if (
                activeKey == 'basic' ||
                activeKey == 'cluster' ||
                activeKey == 'env'
              ) {
                setActiveTab(activeKey);
              }
            }}
          >
            <Tabs.TabPane tab="基础信息" key="basic">
              <DynamicForm
                form={basicForm}
                fields={basicFields}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 14 }}
              />
            </Tabs.TabPane>

            <Tabs.TabPane tab="集群配置" key="cluster">
              <div
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setVisible(true)}
                >
                  添加配置项
                </Button>
              </div>
              <FieldConfigTable
                fields={formConfig.app_field_configs.filter(
                  (item) => item.config_type == 'cluster',
                )}
                editField={handleEditField}
                removeField={handleRemoveField}
                editFieldHelm={handleEditFieldHelm}
                changeOrder={handleChangeOrder}
              />
            </Tabs.TabPane>

            <Tabs.TabPane tab="环境变量" key="env">
              <div
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setVisible(true)}
                >
                  添加环境变量
                </Button>
              </div>
              <FieldConfigTable
                fields={formConfig.app_field_configs.filter(
                  (item) => item.config_type == 'env',
                )}
                editField={handleEditField}
                removeField={handleRemoveField}
                editFieldHelm={handleEditFieldHelm}
                changeOrder={handleChangeOrder}
              />
            </Tabs.TabPane>
          </Tabs>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={loading}
            >
              {app_id == undefined ? '注册应用' : '保存配置'}
            </Button>
          </div>
        </Form>
      </Card>

      <FieldConfigModal
        init_field={field}
        visible={visible}
        nameValidator={(_, value) => {
          if (formConfig.app_field_configs.length > 0) {
            const names: string[] = formConfig.app_field_configs
              .filter((item) => item.config_type == activeTab)
              .map((item) => item.name || '');
            if (value && names.includes(value)) {
              return Promise.reject(
                // new Error(`字段名不能为 ${names.join('、')}，请更换其他名称`),
                new Error(`字段名不能为 ${value}，请更换其他名称`),
              );
            }
          }
          return Promise.resolve('');
        }}
        onCancel={() => {
          setVisible(false);
        }}
        onSave={handleOnSaveField}
      />
      <FieldHelmConfigModal
        visible={helmVisible}
        init_field={field}
        chartName={selectedHelmChart}
        onCancel={() => setHelmVisible(false)}
        onSave={handleOnSaveField}
      />
    </PageContainer>
  );
};

export default Editor;
