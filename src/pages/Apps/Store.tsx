import services from '@/services';
import { App } from '@/services/AppController';
import {
  AppstoreOutlined,
  CodeOutlined,
  ContainerOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Card,
  Col,
  Divider,
  Empty,
  message,
  Pagination,
  Row,
  Space,
  Tooltip,
} from 'antd';
import { useEffect, useState } from 'react';

const { Meta } = Card;
const Store: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('全部应用');
  const [apps, setApps] = useState<App[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [paginationParams, setPaginationParams] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 8,
  });
  const getConfig = async () => {
    const { code, data } = await services.AppsController.list(
      '',
      paginationParams.pageSize,
      paginationParams.current,
    );
    if (code == 200) {
      setApps(data.data);
      setTotal(data.total);
    } else {
      message.error('获取应用信息失败');
    }
  };
  useEffect(() => {
    getConfig();
  }, [paginationParams]);
  // 分类数据
  const categories = [
    { key: '全部应用', label: '全部应用', icon: <AppstoreOutlined /> },
    { key: '数据库', label: '数据库', icon: <DatabaseOutlined /> },
    { key: '研发与运维', label: '研发与运维', icon: <CodeOutlined /> },
    { key: '容器', label: '容器', icon: <ContainerOutlined /> },
  ];
  // 筛选应用
  const filteredApps = apps.filter((app) => {
    if (activeCategory === '全部应用') {
      return true;
    }
    // 分类筛选
    return app.category.includes(activeCategory);
  });
  function getFirstMatchedValueFromB(app_name: string): string {
    if (!app_name) return '';
    return `/app_logo/${app_name.toLowerCase()}_logo.png`;
  }
  const get_cover = (app_name: string) => {
    const img_file = getFirstMatchedValueFromB(app_name);
    if (img_file != null) {
      return (
        <img
          draggable={false}
          alt={app_name}
          src={img_file}
          style={{ width: '100%', height: 215 }}
        />
      );
    } else {
      return <div style={{ width: '100%', height: 215 }} />;
    }
  };

  return (
    <PageContainer>
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        {categories.map((category) => (
          <Col span={4}>
            <Card
              onClick={() => setActiveCategory(category.key)}
              style={
                category.key == activeCategory
                  ? {
                      textAlign: 'center',
                      fontSize: 'large',
                      backgroundColor: '#e6f7ff',
                    }
                  : {
                      textAlign: 'center',
                      fontSize: 'large',
                    }
              }
              hoverable={true}
            >
              {category.label}
              {category.icon}
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      {/* 应用卡片 */}
      {filteredApps.length == 0 ? (
        <Col span={24} key={'empty'}>
          <Empty image={Empty.PRESENTED_IMAGE_DEFAULT} />
        </Col>
      ) : (
        <Space wrap={true}>
          {filteredApps.map((app) => (
            <Card
              style={{ width: 300, height: 360 }}
              cover={get_cover(app.name)}
              actions={[
                <a onClick={() => history.push(`/apps/deploy/${app.app_id}`)}>
                  立即部署
                </a>,
              ]}
            >
              <Meta
                style={{ textAlign: 'center' }}
                title={app.name}
                description={
                  <Tooltip title={app.description} placement="top">
                    <div
                      style={{
                        whiteSpace: 'nowrap', // 强制单行
                        overflow: 'hidden', // 超出隐藏
                        textOverflow: 'ellipsis', // 超出显示省略号
                        maxWidth: '100%', // 适配 Card 宽度（关键，避免省略失效）
                        cursor: 'pointer', // 鼠标 hover 显示手型，提示可查看
                      }}
                    >
                      {app.description}
                    </div>
                  </Tooltip>
                }
              />
            </Card>
          ))}
        </Space>
      )}
      <Divider />
      <Pagination
        style={{
          border: '2px dashed #ccc',
          padding: '8px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'center',
        }}
        {...paginationParams}
        hideOnSinglePage={true}
        total={total}
        onChange={(current, pageSize) =>
          setPaginationParams({ current, pageSize })
        }
      />
    </PageContainer>
  );
};

export default Store;
