import { Card, Col, Progress, Row } from "antd";
import React from "react";
import { DataPoint3 } from "./data";

interface CpuUsageProps {
  dataSource?: DataPoint3;
  loading?: boolean;
}

const DataPoint: React.FC<CpuUsageProps> = ({
  dataSource = { use: 0, total: 100, name: "" },
  loading = false,
}) => {
  return (
    <Card loading={loading}>
      <Row gutter={12} align="middle">
        <Col
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Progress
            percent={dataSource.use / dataSource.total * 100}
            strokeColor={{
              "0%": "#87d068",
              "50%": "#ffe58f",
              "100%": "#ffccc7",
            }}
            type="circle"
            format={(percent) => `${(percent ?? 0).toFixed(2)}%`}
          />
        </Col>
        <Col>
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#1890ff",
              }}
            >
              {dataSource.name}
            </div>
            <div
              style={{
                fontSize: "20px",
                color: "#666",
                marginTop: "4px",
              }}
            >
              {dataSource.use}/{dataSource.total}
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default DataPoint;
