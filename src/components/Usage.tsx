import { Area } from '@ant-design/plots';
import { Card } from 'antd';
import React from 'react';
import { DataPoint2 } from './data';

interface UsageProps {
  dataSource?: DataPoint2[];
  loading?: boolean;
  title: string;
  yTitle: string;
  styleFill?: string;
  unit?: string;
}

const Usage: React.FC<UsageProps> = ({
  dataSource = [],
  loading = false,
  title = '',
  yTitle = '',
  styleFill = '',
  unit = '',
}) => {
  // 图表配置
  const config: any = {
    data: dataSource, // 使用预处理后的数据
    xField: 'x',
    yField: 'y',
    seriesField: 'type',
    interaction: {
      tooltip: {
        marker: false,
      },
    },
    style: {
      fill: styleFill
        ? styleFill
        : 'linear-gradient(-90deg, white 0%, darkgreen 100%)',
    },
    axis: {
      y: {
        title: yTitle,
        labelFormatter: (d: any) => (unit ? `${d}${unit}` : `${d}`),
      },
    },
  };
  return (
    <Card title={title} loading={loading}>
      <Area {...config} height={200} />
    </Card>
  );
};

export default Usage;
