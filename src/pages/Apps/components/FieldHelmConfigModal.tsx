import services from '@/services';
import { AppFieldConfig, HelmProps } from '@/services/AppController';
import { yamlToProperties } from '@/utils/yaml';
import {
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
const { Title } = Typography;

interface FieldHelmConfigModalProps {
  visible: boolean;
  init_field: AppFieldConfig;
  chartName: string;
  onCancel: () => void;
  onSave: (field: AppFieldConfig) => void;
}

export const FieldHelmConfigModal: React.FC<FieldHelmConfigModalProps> = ({
  visible,
  init_field,
  chartName,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm<HelmProps>();

  const [topSelectValue, setTopSelectValue] = useState<string>();
  const [topSelectOptions, setTopSelectOptions] =
    useState<{ label: string; value: string }[]>();
  const [helmConfigOptions, setHelmConfigOptions] =
    useState<{ label: string; value: string }[]>();
  // 字段类型选项
  const fieldTypeOptions = [
    { label: 'boolean', value: 'boolean' },
    { label: 'string', value: 'string' },
    { label: 'number', value: 'number' },
  ];

  const fetchArtifacts = async (current = 1, pageSize = 100) => {
    const { code, data } = await services.ArtifactsController.get_artifacts(
      'charts',
      encodeURIComponent(encodeURIComponent(chartName)),
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
            label: `${item.extra_attrs.version}(${item.extra_attrs.appVersion})`,
            value: item.digest,
          }),
        );
      if (options.length > 0) {
        setTopSelectOptions(options);
        setTopSelectValue(options[0].value);
      }
      //   if (data.length > 0) {
      //     setSelectedArtifacts(data[0]);
      //   }
    }
  };
  const fetchArtifactValue = async (current = 1, pageSize = 100) => {
    const { code, data } = await services.ArtifactsController.chart_values(
      'charts',
      encodeURIComponent(encodeURIComponent(chartName)),
      topSelectValue || '',
    );
    if (code == 200) {
      const mapData = yamlToProperties(data);
      setHelmConfigOptions(
        mapData.map(([key, value]) => ({
          label: value && value != '' ? `${key}(默认值:${value})` : key,
          value: key,
        })),
      );
    }
  };
  useEffect(() => {
    if (topSelectValue) {
      fetchArtifactValue();
    }
  }, [topSelectValue]);
  useEffect(() => {
    if (chartName) {
      fetchArtifacts();
    }
  }, [chartName]);
  useEffect(() => {
    form.setFieldsValue(
      init_field.helm_props || { type: 'string', keys: [], unit: '' },
    );
  }, [init_field]);

  const handleFieldConfigSubmit = () => {
    form
      .validateFields()
      .then((value) => {
        const submitValues = {
          ...init_field,
          helm_props: value,
        };

        onSave(submitValues);
        onCancel();
      })
      .catch((info) => {
        console.error('表单验证失败:', info);
        message.error('请完善必填项配置');
      });
  };

  return (
    <Modal
      title={
        // 自定义Modal标题栏：左侧标题 + 右侧选择框
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            关联helm配置
          </Title>
          <Select
            showSearch={true}
            placeholder="请选择关联chart版本"
            style={{ width: 200 }}
            onChange={(val) => setTopSelectValue(val)}
            value={topSelectValue}
            filterOption={(input, option) => {
              return (
                option?.label.toLowerCase().includes(input.toLowerCase()) ||
                false
              );
            }}
            options={topSelectOptions}
          />
        </div>
      }
      closable={false}
      open={visible}
      onCancel={onCancel}
      onOk={handleFieldConfigSubmit}
      destroyOnHidden={false}
      afterClose={() => {
        form.resetFields();
      }}
      width={800} // 加宽弹窗适配规则配置
    >
      {/* Form表单区域 */}
      <Form
        form={form}
        layout="vertical" // 垂直布局（label在上，输入框在下）
        // onFinish={handleFormSubmit}
        style={{ marginTop: 16 }}
      >
        {/* 2.1 关联helm配置（tag选择框） */}
        <Form.Item<HelmProps>
          name="keys"
          label="设置关联helm配置"
          rules={[{ required: true, message: '请选择关联helm配置' }]}
        >
          <Select
            // mode="multiple"
            mode="tags"
            showSearch={true}
            placeholder="请选择/输入关联helm配置"
            style={{ width: '100%' }}
            filterOption={(input, option) => {
              return (
                option?.label.toLowerCase().includes(input.toLowerCase()) ||
                false
              );
            }}
            tagRender={(props) => (
              <Tag
                color="cyan"
                closable={props.closable}
                onClose={props.onClose}
              >
                {props.label}
              </Tag>
            )}
            options={helmConfigOptions}
          />
        </Form.Item>

        {/* 2.2 字段类型（单选） */}
        <Form.Item<HelmProps>
          name="type"
          label="字段类型"
          rules={[{ required: true, message: '请选择字段类型' }]}
        >
          <Radio.Group
            options={fieldTypeOptions}
            // onChange={(e: RadioChangeEvent) => {
            //   console.log('字段类型变更：', e.target.value);
            // }}
          />
        </Form.Item>

        {/* 2.3 单位 */}
        <Form.Item<HelmProps> name="unit" label="单位">
          <Input
            placeholder="例如：Gi / m / % （非必填）"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
