import type { DynamicFieldConfig } from '@/services/AppConfigController';
import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;
const { Option } = Select;

// 仅保留指定字段类型
const FIELD_TYPES = [
  { label: '文本输入', value: 'text' },
  { label: '密码输入', value: 'password' },
  { label: '数字输入', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '单选框组', value: 'radio' },
  { label: '开关', value: 'switch' },
];

// 初始字段配置
const getInitialField = (index: number): DynamicFieldConfig => ({
  name: `field_${index}`,
  label: `字段 ${index + 1}`,
  type: 'text',
  rules: [],
  initialValue: '',
  fieldProps: {
    placeholder: `请输入${index + 1}`,
    allowClear: true,
  },
});

// 校验JSON格式（仅用于下拉/单选选项配置）
const validateJSON = (str: string) => {
  if (!str) return { valid: true, data: [] };
  try {
    const data = JSON.parse(str);
    if (Array.isArray(data) && data.every((item) => item.label && item.value)) {
      return { valid: true, data };
    }
    return { valid: false, message: '格式错误，需为包含label/value的数组' };
  } catch (e) {
    return { valid: false, message: 'JSON格式错误' };
  }
};

// 类型适配初始值（仅处理保留的类型）
const adaptInitialValue = (value: any, type: string) => {
  switch (type) {
    case 'number':
      return value === '' ? undefined : Number(value);
    case 'switch':
      return value === 'true' || value === true;
    default: // text/password/select/radio
      return value;
  }
};

// 兼容型复制文本到剪贴板
const copyToClipboard = (text: string): Promise<void> => {
  // 优先使用现代API
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  // 降级方案：创建临时textarea实现复制
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 隐藏textarea
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        resolve();
      } else {
        reject(new Error('复制失败'));
      }
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textArea);
    }
  });
};

const FieldConfigGenerator: React.FC = () => {
  const [fields, setFields] = useState<DynamicFieldConfig[]>([
    getInitialField(0),
  ]);
  const [form] = Form.useForm();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [jsonError, setJsonError] = useState('');

  // 当前编辑的字段
  const currentField = fields[currentIndex] || fields[0];

  // 监听currentIndex变化，更新表单值
  useEffect(() => {
    if (currentField) {
      const formValues = {
        name: currentField.name,
        label: currentField.label,
        type: currentField.type,
        required: currentField.rules?.some((rule) => rule.required) || false,
        initialValue: adaptInitialValue(
          currentField.initialValue,
          currentField.type,
        ),
        placeholder: currentField.fieldProps?.placeholder || '',
        allowClear: currentField.fieldProps?.allowClear !== false,
        options: currentField.fieldProps?.options
          ? JSON.stringify(currentField.fieldProps.options, null, 2)
          : '',
      };
      form.setFieldsValue(formValues);
      setJsonError('');
    }
  }, [currentIndex, currentField, form]);

  // 字段类型切换联动
  const handleTypeChange = (type: string) => {
    // 重置类型相关配置项
    form.setFieldsValue({
      initialValue: '',
      placeholder: `请输入${currentField.label}`,
      allowClear: true,
      options: '',
    });
    setJsonError('');

    // 立即更新当前字段类型（预览同步）
    updateField(currentIndex, { type });
  };

  // 校验选项配置JSON
  const handleOptionsChange = (value: string) => {
    const result = validateJSON(value);
    if (!result.valid) {
      setJsonError(result.message || 'JSON格式错误');
    } else {
      setJsonError('');
    }
  };

  // 添加新字段
  const addField = () => {
    const newField = getInitialField(fields.length);
    setFields([...fields, newField]);
    setCurrentIndex(fields.length);
  };

  // 删除字段
  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
    setCurrentIndex(Math.max(0, index - 1));
  };

  // 更新字段配置
  const updateField = (index: number, values: Partial<DynamicFieldConfig>) => {
    const newFields = [...fields];
    const oldField = newFields[index];

    // 整合fieldProps
    const fieldProps = {
      ...oldField.fieldProps,
      placeholder: values.placeholder ?? oldField.fieldProps?.placeholder,
      allowClear: values.allowClear ?? oldField.fieldProps?.allowClear,
      ...(values.options ? { options: values.options } : {}),
    };

    // 处理必填规则
    let rules = [...(oldField.rules || [])];
    if (values.required !== undefined) {
      rules = rules.filter((rule) => rule.required !== true);
      if (values.required) {
        rules.push({ required: true, message: `请输入${oldField.label}` });
      }
    }

    // 整合最终配置
    newFields[index] = {
      ...oldField,
      ...values,
      rules,
      fieldProps,
      initialValue:
        values.initialValue !== undefined
          ? adaptInitialValue(values.initialValue, newFields[index].type)
          : oldField.initialValue,
    };

    setFields(newFields);
  };

  // 处理表单提交
  const handleFieldConfigSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        // 处理选项配置
        let options = [];
        if (values.options) {
          const jsonResult = validateJSON(values.options);
          if (!jsonResult.valid) {
            setJsonError(jsonResult.message || 'JSON格式错误');
            return;
          }
          options = jsonResult.data || [];
        }

        // 整合提交值
        const submitValues = {
          name: values.name,
          label: values.label,
          type: values.type,
          required: values.required,
          initialValue: values.initialValue,
          placeholder: values.placeholder,
          allowClear: values.allowClear,
          options,
        };

        updateField(currentIndex, submitValues);
        message.success('配置已更新');
      })
      .catch((info) => {
        console.error('表单验证失败:', info);
        message.error('请完善必填项配置');
      });
  };

  // 复制配置到剪贴板（兼容版）
  const copyConfig = () => {
    const configStr = JSON.stringify(fields, null, 2);

    copyToClipboard(configStr)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        message.success('配置已复制到剪贴板');
      })
      .catch((err) => {
        console.error('复制失败:', err);
        // 手动选中预览框内容，方便用户手动复制
        const preElement = document.querySelector('pre');
        if (preElement) {
          const range = document.createRange();
          range.selectNodeContents(preElement);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        message.error('自动复制失败，请手动复制配置内容');
      });
  };

  // 表格列定义
  const columns = [
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const fieldType = FIELD_TYPES.find((item) => item.value === type);
        return fieldType ? fieldType.label : type;
      },
    },
    {
      title: '必填',
      key: 'required',
      render: (_: any, record: any) => {
        const isRequired = record.rules?.some((rule: any) => rule.required);
        return isRequired ? (
          <Tag color="red">是</Tag>
        ) : (
          <Tag color="gray">否</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, __: any, index: number) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setCurrentIndex(index)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个字段吗？"
            onConfirm={() => removeField(index)}
            okText="是"
            cancelText="否"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>DynamicForm 配置生成器</Title>
      <Text type="secondary">
        可视化配置表单字段，生成可直接被DynamicForm解析的JSON配置
      </Text>

      <Divider orientation="left">字段列表</Divider>

      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button type="primary" icon={<PlusOutlined />} onClick={addField}>
          添加字段
        </Button>
        <Button
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={copyConfig}
        >
          {copied ? '已复制' : '复制配置'}
        </Button>
      </div>

      <Table
        dataSource={fields}
        columns={columns}
        rowKey="name"
        pagination={false}
        style={{ marginBottom: 24 }}
        onRow={(record, index) => ({
          onClick: () => setCurrentIndex(index || 0),
          style: {
            backgroundColor: index === currentIndex ? '#f5f5f5' : 'inherit',
            cursor: 'pointer',
          },
        })}
      />

      <Divider orientation="left">字段配置</Divider>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFieldConfigSubmit}
          validateMessages={{
            required: '${label}为必填项',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Form.Item
              name="name"
              label="字段名 (name)"
              rules={[{ required: true, message: '请输入字段名' }]}
            >
              <Input placeholder="如：username、phone、age" />
            </Form.Item>

            <Form.Item
              name="label"
              label="标签 (label)"
              rules={[{ required: true, message: '请输入字段标签' }]}
            >
              <Input placeholder="如：用户名、手机号、年龄" />
            </Form.Item>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}
          >
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

            <Form.Item name="required" label="是否必填" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Form.Item name="initialValue" label="默认值 (initialValue)">
            {currentField.type === 'number' ? (
              <InputNumber
                style={{ width: '100%' }}
                placeholder="数字类型默认值"
                precision={0}
              />
            ) : currentField.type === 'switch' ? (
              <Switch
                checkedChildren="是"
                unCheckedChildren="否"
                // valuePropName="checked"
              />
            ) : (
              <Input placeholder={`请输入${currentField.label || '默认值'}`} />
            )}
          </Form.Item>

          {/* 文本/密码字段专属配置 */}
          {(currentField.type === 'text' ||
            currentField.type === 'password') && (
            <Form.Item name="placeholder" label="占位提示 (placeholder)">
              <Input placeholder={`请输入${currentField.label || '内容'}`} />
            </Form.Item>
          )}

          {/* 可清空字段专属配置（文本/密码/下拉） */}
          {(currentField.type === 'text' ||
            currentField.type === 'password' ||
            currentField.type === 'select') && (
            <Form.Item
              name="allowClear"
              label="允许清空"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}

          {/* 下拉/单选专属选项配置 */}
          {(currentField.type === 'select' ||
            currentField.type === 'radio') && (
            <Form.Item
              name="options"
              label="选项配置 (options)"
              tooltip="格式: [{label:'选项1',value:'1'},{label:'选项2',value:'2'}]"
              validateStatus={jsonError ? 'error' : 'success'}
              help={jsonError || '请输入JSON格式的选项配置'}
            >
              <Input.TextArea
                placeholder='[{"label":"选项1","value":"1"},{"label":"选项2","value":"2"}]'
                rows={4}
                onChange={(e) => handleOptionsChange(e.target.value)}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large">
              保存字段配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider orientation="left">配置结果预览</Divider>
      <Card>
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            overflowX: 'auto',
            maxHeight: '400px',
            fontFamily: 'Consolas, monospace',
          }}
        >
          {JSON.stringify(fields, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default FieldConfigGenerator;
