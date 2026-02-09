import {
  Form,
  FormInstance,
  FormProps,
  Input,
  InputNumber,
  Radio,
  Select,
  SelectProps,
  Switch,
} from 'antd';
import React from 'react';

import { AppFieldConfig } from '@/services/AppController';

// 动态表单组件
interface DynamicFormProps extends Omit<FormProps, 'fields' | 'form'> {
  fields: AppFieldConfig[];
  form: FormInstance;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  form,
  fields,
  ...formProps
}) => {
  const renderField = (field: AppFieldConfig) => {
    if (field == undefined) {
      return;
    }
    let { type, field_props = {} } = field;

    switch (type) {
      case 'text':
        return (
          <Input
            placeholder={field_props.placeholder}
            allowClear={field_props.allowClear}
            prefix={field_props.prefix}
            variant={field_props.variant}
            {...field_props}
          />
        );

      case 'password':
        return (
          <Input.Password
            placeholder={field_props.placeholder}
            allowClear={field_props.allowClear}
            variant={field_props.variant}
            {...field_props}
          />
        );

      case 'textarea':
        return (
          <Input.TextArea
            placeholder={field_props.placeholder}
            allowClear={field_props.allowClear}
            showCount={field_props.showCount}
            variant={field_props.variant}
            rows={4}
            {...{ ...field_props, prefix: undefined }}
          />
        );

      case 'number':
        return (
          <InputNumber
            placeholder={field_props.placeholder}
            min={field_props.min}
            max={field_props.max}
            step={field_props.step}
            style={{ width: '100%' }}
            variant={field_props.variant}
            {...field_props}
          />
        );

      case 'select':
        return (
          <Select
            placeholder={field_props.placeholder}
            allowClear={field_props.allowClear}
            mode={field_props.mode}
            options={field_props.options}
            {...(field_props as SelectProps)}
          />
        );

      case 'radio':
        return (
          <Radio.Group
            options={field_props.options}
            disabled={field_props.disabled}
            {...field_props}
          />
        );

      case 'switch':
        const {
          placeholder,
          prefix,
          allowClear,
          showCount,
          min,
          max,
          step,
          options,
          selectMode,
          uploadAction,
          accept,
          variant,
          checkboxOptions,
          ...switchProps
        } = field_props;
        return <Switch {...switchProps} />;

      default:
        return null;
    }
  };

  return (
    <Form form={form} layout="horizontal" {...formProps}>
      {fields.map((field) => (
        <Form.Item
          key={field.field_id}
          name={field.name}
          label={field.label}
          rules={field.rules}
          extra={field.extra}
          initialValue={field.initial_value}
          {...field.form_item_props}
        >
          {renderField(field)}
        </Form.Item>
      ))}
    </Form>
  );
};

export default DynamicForm;
