import { Area } from '@ant-design/plots';
import { Card, Empty } from 'antd';
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
  title,
  yTitle,
  styleFill,
  unit = '',
}) => {
  const color = styleFill?.startsWith('#') ? styleFill : '#2563eb';
  const config: any = {
    data: dataSource,
    xField: 'x',
    yField: 'y',
    colorField: 'type',
    scale: {
      color: { range: [color, '#8299bd', '#77c6b9'] },
      y: { zero: true },
    },
    style: {
      fill: `linear-gradient(-90deg, white 0%, ${color} 100%)`,
      fillOpacity: 0.2,
    },
    line: { style: { stroke: color, lineWidth: 2 } },
    axis: {
      x: {
        title: false,
        labelAutoRotate: false,
        tickCount: 6,
        labelFill: '#596b83',
        labelOpacity: 1,
        labelFontSize: 10,
      },
      y: {
        title: yTitle,
        labelFill: '#596b83',
        labelOpacity: 1,
        labelFontSize: 10,
        gridStroke: '#e8edf4',
        gridLineDash: [3, 4],
        labelFormatter: (value: any) => `${value}`,
      },
    },
    legend: false,
    interaction: { tooltip: { marker: true } },
    animate: false,
  };
  return (
    <Card
      className="ke-chart"
      title={
        <span className="ke-chart-title">
          <i className="ke-chart-key" style={{ background: color }} />
          {title}
        </span>
      }
      extra={<span className="ke-section-caption">实际使用量 · {unit}</span>}
      loading={loading}
    >
      {dataSource.length ? (
        <div
          role="img"
          aria-label={`${title}，共 ${dataSource.length} 个采样点；最近采样值 ${
            dataSource[dataSource.length - 1]?.y
          } ${unit}`}
        >
          <Area {...config} height={200} />
        </div>
      ) : (
        <div style={{ height: 200, display: 'grid', placeItems: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无监控数据"
          />
        </div>
      )}
    </Card>
  );
};
export default Usage;
