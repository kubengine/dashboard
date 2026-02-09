import { AppFieldConfig } from '@/services/AppController';
import {
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { FIELD_TYPES } from './FieldConfigModal';

interface FieldConfigTableProps {
  fields: AppFieldConfig[];
  editField: (field: AppFieldConfig) => void;
  editFieldHelm: (field: AppFieldConfig) => void;
  removeField: (field: AppFieldConfig) => void;
  changeOrder: (
    currentName: string,
    currentIndex: number,
    targetName: string,
    targetIndex: number,
  ) => void;
}

export const FieldConfigTable: React.FC<FieldConfigTableProps> = ({
  fields,
  editField,
  editFieldHelm,
  removeField,
  changeOrder,
}) => {
  const [dataSource, setDataSource] = useState<AppFieldConfig[]>([]);
  useEffect(() => {
    if (fields) {
      setDataSource(
        [...fields].sort((a: AppFieldConfig, b: AppFieldConfig) => {
          return a.order - b.order;
        }),
      );
    }
  }, [fields]);

  /**
   * 调整行顺序：交换两行数据的位置
   * @param currentIndex 当前行索引
   * @param targetIndex 目标行索引
   */
  const swapRow = (currentIndex: number, targetIndex: number) => {
    // 生成新的数据源（不可变操作，避免直接修改原数组）
    const newData = [...dataSource];
    changeOrder(
      newData[currentIndex].name,
      currentIndex,
      newData[targetIndex].name,
      targetIndex,
    );
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
      render: (_: any, record: AppFieldConfig) => {
        const isRequired =
          record.form_item_props.required ||
          record.rules.some((rule) => rule.required);
        return isRequired ? (
          <Tag color="red">是</Tag>
        ) : (
          <Tag color="gray">否</Tag>
        );
      },
    },
    {
      title: '顺序调整',
      key: 'sort',
      width: 120,
      // 自定义渲染上下箭头按钮
      render: (_: any, __: any, index: number) => (
        <Space size="small">
          {/* 向上箭头：首行禁用 */}
          <Button
            type="text"
            icon={<UpOutlined />}
            size="small"
            disabled={index === 0}
            onClick={() => swapRow(index, index - 1)}
            aria-label="上移"
          />
          {/* 向下箭头：末行禁用 */}
          <Button
            type="text"
            icon={<DownOutlined />}
            size="small"
            disabled={index === dataSource.length - 1}
            onClick={() => swapRow(index, index + 1)}
            aria-label="下移"
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: AppFieldConfig) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => editField(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => editFieldHelm(record)}
          >
            关联helm配置
          </Button>
          <Popconfirm
            title="确定要删除这个字段吗？"
            onConfirm={() => removeField(record)}
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
    <>
      <Table<AppFieldConfig>
        dataSource={dataSource}
        columns={columns}
        rowKey="name"
        pagination={false}
        style={{ marginBottom: 24 }}
      />
    </>
  );
};
