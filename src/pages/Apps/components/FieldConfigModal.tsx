import {
  AppFieldConfig,
  get_init_field_config,
} from '@/services/AppController';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
} from 'antd';
import { RuleObject } from 'antd/es/form';
import { useEffect, useState } from 'react';

const { Option } = Select;

// 参考 Ant Design Form.Item Rule 类型，简化定义适配配置场景
interface ValidationRule {
  type?: 'string' | 'number' | 'email' | 'url'; // 校验类型
  min?: number; // 最小长度/数值
  max?: number; // 最大长度/数值
  message?: string; // 错误提示信息
}

interface FieldConfigModalProps {
  init_field: AppFieldConfig;
  visible: boolean;
  onCancel: () => void;
  onSave: (field: AppFieldConfig) => void;
  nameValidator: (obj: RuleObject, value: string) => Promise<string>;
}

// 仅保留指定字段类型
export const FIELD_TYPES = [
  { label: '文本输入', value: 'text' },
  { label: '密码输入', value: 'password' },
  { label: '数字输入', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '单选框组', value: 'radio' },
  { label: '开关', value: 'switch' },
];

// 校验类型选项
export const RULE_TYPES = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '邮箱', value: 'email' },
  { label: '网址', value: 'url' },
];

// 触发方式选项
export const TRIGGER_TYPES = [
  { label: '失去焦点', value: 'blur' },
  { label: '值变化', value: 'change' },
  { label: '失去焦点+值变化', value: 'blur,change' },
];

export const FieldConfigModal: React.FC<FieldConfigModalProps> = ({
  init_field,
  visible,
  onCancel,
  onSave,
  nameValidator,
}) => {
  const [form] = Form.useForm();
  const [options, setOptions] = useState<
    Array<{ label: string | number; value: string | number }>
  >([]);
  const [rules, setRules] = useState<RuleObject[]>([]); // 校验规则列表
  const [field, setField] = useState<AppFieldConfig>(init_field);

  useEffect(() => {
    setField((prev) => ({
      ...prev,
      field_props: { ...prev.field_props, options },
    }));
  }, [options]);

  useEffect(() => {
    setField((prev) => ({
      ...prev,
      rules,
    }));
  }, [rules]);

  useEffect(() => {
    setField(init_field);
    setOptions(init_field.field_props.options || []);
    setRules(init_field.rules);
    form.setFieldsValue(init_field);
  }, [init_field]);

  // ===== 选项相关方法 =====
  const addOption = () => {
    setOptions((prev) => [...prev, { label: '', value: '' }]);
  };

  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const updateOption = (
    index: number,
    key: 'label' | 'value',
    value: string,
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [key]: value };
    setOptions(newOptions);
  };

  // ===== 校验规则相关方法 =====
  const addRule = () => {
    setRules((prev) => [...prev, { type: 'string', message: '' }]);
  };

  const removeRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const updateRule = (index: number, key: keyof ValidationRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [key]: value };
    setRules(newRules);
  };

  // 处理表单提交
  const handleFieldConfigSubmit = () => {
    form
      .validateFields()
      .then((value) => {
        // 1. 验证选项是否完整（针对select/radio）
        if (field.type === 'select' || field.type === 'radio') {
          if (field.field_props.options == undefined) {
            message.error('请完善所有选项的标签和值');
          } else {
            const invalidOption = field.field_props.options.find(
              (option) => !option.label || !option.value,
            );
            if (invalidOption) {
              message.error('请完善所有选项的标签和值');
              return;
            }
          }
        }

        // 3. 整合最终提交数据
        const submitValues = {
          ...field,
          ...value,
          rules,
          initial_value: value.initial_value,
          field_props: {
            ...value.field_props,
            options,
          },
        };

        onSave(submitValues);
        onCancel();
      })
      .catch((info) => {
        console.error('表单验证失败:', info);
        message.error('请完善必填项配置');
      });
  };

  // 字段类型切换联动
  const handleTypeChange = (
    type: 'text' | 'password' | 'number' | 'select' | 'radio' | 'switch',
  ) => {
    const value = form.getFieldsValue();
    setField({
      ...value,
      type,
    });
  };

  return (
    <Modal
      title="字段配置"
      open={visible}
      onCancel={onCancel}
      onOk={handleFieldConfigSubmit}
      destroyOnHidden={false}
      afterClose={() => {
        setField(get_init_field_config());
        form.resetFields();
        setOptions([]);
        setRules([]);
      }}
      afterOpenChange={(open) => {
        if (!open) {
          setField(get_init_field_config());
          form.resetFields();
          setOptions([]);
          setRules([]);
        }
      }}
      width={800} // 加宽弹窗适配规则配置
    >
      <Form
        form={form}
        layout="vertical"
        validateMessages={{
          required: '${label}为必填项',
        }}
      >
        {/* 基础配置区 */}
        <div
          style={{
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h4 style={{ margin: '0 0 16 0', fontSize: 16 }}>基础配置</h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <Form.Item
              name="name"
              label="字段名 (name)"
              rules={[
                { required: true, message: '请输入字段名' },
                {
                  validator: (obj: RuleObject, value: any) => {
                    if (
                      field != undefined &&
                      field.name != '' &&
                      field.name != undefined
                    ) {
                      return Promise.resolve();
                    } else {
                      return nameValidator(obj, value);
                    }
                  },
                },
              ]}
            >
              <Input
                placeholder="如：username、phone、age"
                disabled={field.name != '' && field.name == init_field.name}
              />
            </Form.Item>

            <Form.Item
              name="label"
              label="标签 (label)"
              rules={[{ required: true, message: '请输入字段标签' }]}
            >
              <Input
                placeholder="如：用户名、手机号、年龄"
                disabled={field.label != '' && field.label == init_field.label}
              />
            </Form.Item>

            <Form.Item
              name="extra"
              label="额外的提示信息 (extra)"
              tooltip="额外的提示信息，和 help 类似，当需要错误信息和提示文案同时出现时，可以使用这个。"
            >
              <Input />
            </Form.Item>

            <Form.Item
              name={['form_item_props', 'required']}
              label="是否必填"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="type"
              label="字段类型 (type)"
              rules={[{ required: true, message: '请选择字段类型' }]}
            >
              <Select
                placeholder="选择字段类型"
                onChange={handleTypeChange}
                showSearch
                optionFilterProp="children"
              >
                {FIELD_TYPES.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="initial_value" label="默认值 (initialValue)">
              {field.type === 'number' ? (
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="数字类型默认值"
                  precision={0}
                />
              ) : field.type === 'switch' ? (
                <Switch checkedChildren="是" unCheckedChildren="否" />
              ) : (
                <Input placeholder={`请输入${field.label || '默认值'}`} />
              )}
            </Form.Item>
          </div>

          {/* 文本/密码字段专属配置 */}
          {(field.type === 'text' || field.type === 'password') && (
            <Form.Item
              name={['field_props', 'placeholder']}
              label="占位提示 (placeholder)"
              style={{ marginTop: 16 }}
            >
              <Input placeholder={`请输入${field.label || '内容'}`} />
            </Form.Item>
          )}

          {/* 可清空字段专属配置（文本/密码/下拉） */}
          {(field.type === 'text' ||
            field.type === 'password' ||
            field.type === 'select') && (
            <Form.Item
              name={['field_props', 'allowClear']}
              label="允许清空"
              valuePropName="checked"
              style={{ marginTop: 16 }}
            >
              <Switch />
            </Form.Item>
          )}
        </div>

        {/* 选项配置区（select/radio专属） */}
        {(field.type === 'select' || field.type === 'radio') && (
          <div
            style={{
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <h4 style={{ margin: '0 0 16 0', fontSize: 16 }}>选项配置</h4>
            <div>
              {options.map((option, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <Input
                    placeholder="选项标签"
                    value={option.label}
                    onChange={(e) =>
                      updateOption(index, 'label', e.target.value)
                    }
                    style={{ flex: 1 }}
                  />
                  <Input
                    placeholder="选项值"
                    value={option.value}
                    onChange={(e) =>
                      updateOption(index, 'value', e.target.value)
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    danger
                    icon={<MinusOutlined />}
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 1}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addOption}
                style={{ width: '100%' }}
              >
                添加选项
              </Button>
            </div>
          </div>
        )}

        {/* 校验规则配置区 */}
        <div style={{ marginBottom: 8 }}>
          <h4 style={{ margin: '0 0 16 0', fontSize: 16 }}>
            校验规则配置（Rule）
          </h4>
          <div>
            {rules.map((rule, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr auto',
                  gap: 16,
                  marginBottom: 16,
                  padding: 16,
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                }}
              >
                {/* 校验类型 */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: 12,
                      color: '#666',
                    }}
                  >
                    校验类型
                  </label>
                  <Select
                    value={rule.type}
                    onChange={(value) => updateRule(index, 'type', value)}
                    style={{ width: '100%' }}
                  >
                    {RULE_TYPES.map((item) => (
                      <Option key={item.value} value={item.value}>
                        {item.label}
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* 错误提示 */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: 12,
                      color: '#666',
                    }}
                  >
                    错误提示
                  </label>
                  <Input
                    value={(rule.message as string) || ''}
                    onChange={(e) =>
                      updateRule(index, 'message', e.target.value)
                    }
                    placeholder="如：请输入正确的手机号"
                  />
                </div>

                {/* 删除按钮 */}
                <Button
                  danger
                  icon={<MinusOutlined />}
                  onClick={() => removeRule(index)}
                />

                {/* 动态显示：长度/数值限制（string/number类型） */}
                {(rule.type === 'string' || rule.type === 'number') && (
                  <div
                    style={{
                      gridColumn: 'span 4',
                      display: 'flex',
                      gap: 16,
                      marginTop: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          fontSize: 12,
                          color: '#666',
                        }}
                      >
                        {rule.type === 'string' ? '最小长度' : '最小值'}
                      </label>
                      <InputNumber
                        value={rule.min}
                        onChange={(value) => updateRule(index, 'min', value)}
                        style={{ width: '100%' }}
                        placeholder="可选"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          fontSize: 12,
                          color: '#666',
                        }}
                      >
                        {rule.type === 'string' ? '最大长度' : '最大值'}
                      </label>
                      <InputNumber
                        value={rule.max}
                        onChange={(value) => updateRule(index, 'max', value)}
                        style={{ width: '100%' }}
                        placeholder="可选"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addRule}
              style={{ width: '100%' }}
            >
              添加校验规则
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
};
