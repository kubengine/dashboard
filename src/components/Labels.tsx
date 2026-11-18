import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Tooltip } from 'antd';
import { useState } from 'react';

const Labels: React.FC<{ labels: Record<string, string> }> = ({ labels }) => {
  const [expanded, setExpanded] = useState(false);
  const values = Object.entries(labels || {}).map(
    ([name, value]) => `${name}: ${value}`,
  );
  return (
    <Space wrap size={[6, 6]}>
      {(expanded ? values : values.slice(0, 3)).map((label) => (
        <Tooltip key={label} title={label}>
          <Tag
            tabIndex={0}
            style={{
              margin: 0,
              maxWidth: 'min(280px, 100%)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </Tag>
        </Tooltip>
      ))}
      {values.length > 3 && (
        <Button
          type="link"
          size="small"
          aria-expanded={expanded}
          icon={
            expanded ? (
              <UpOutlined aria-hidden="true" />
            ) : (
              <DownOutlined aria-hidden="true" />
            )
          }
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '收起' : `更多（${values.length - 3}）`}
        </Button>
      )}
    </Space>
  );
};
export default Labels;
