import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Tooltip } from 'antd';
import { useState } from 'react';

interface LabelsProps {
  labels: Record<string, string>;
  key: string;
}

const Labels: React.FC<LabelsProps> = ({ labels, key }) => {
  // 状态管理每行的标签展开状态
  const [expandedLabels, setExpandedLabels] = useState<Record<string, boolean>>(
    {},
  );

  // 切换标签展开状态
  const toggleLabelExpansion = (key: string) => {
    setExpandedLabels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  // 将对象格式的标签转换为数组格式
  const formatLabels = (labels: Record<string, string>): string[] => {
    return Object.entries(labels).map(([key, value]) => `${key}: ${value}`);
  };

  const labelArray = formatLabels(labels);
  const isExpanded = expandedLabels[key] || false;
  const maxDisplayCount = 3; // 默认显示3个标签

  // 显示的标签
  const displayLabels = isExpanded
    ? labelArray
    : labelArray.slice(0, maxDisplayCount);
  const hiddenCount = labelArray.length - maxDisplayCount;
  return (
    <Space direction="vertical" size="small">
      {displayLabels.map((label, index) => (
        <Tooltip title={label} placement="top">
          <Tag
            key={index}
            color="blue"
            style={{
              margin: 0,
              whiteSpace: 'nowrap' as const, // 禁止文字换行（必须）
              overflow: 'hidden' as const, // 隐藏溢出内容（必须）
              textOverflow: 'ellipsis' as const, // 溢出部分显示省略号（必须）
              maxWidth: 250, // 控制Tag最大宽度，定义“过长”的标准
              boxSizing: 'border-box' as const, // 宽度包含内边距/边框，避免布局错乱
              cursor: 'pointer' as const, // 鼠标移入显示指针，提示可悬浮
            }}
          >
            {label}
          </Tag>
        </Tooltip>
      ))}

      {!isExpanded && hiddenCount > 0 && (
        <Button
          type="link"
          size="small"
          onClick={() => toggleLabelExpansion(key)}
          icon={<DownOutlined />}
          style={{
            padding: '0 4px',
            height: 'auto',
            fontSize: '12px',
          }}
        >
          更多({hiddenCount})
        </Button>
      )}

      {isExpanded && (
        <Button
          type="link"
          size="small"
          onClick={() => toggleLabelExpansion(key)}
          icon={<UpOutlined />}
          style={{
            padding: '0 4px',
            height: 'auto',
            fontSize: '12px',
          }}
        >
          收起
        </Button>
      )}
    </Space>
  );
};

export default Labels;
