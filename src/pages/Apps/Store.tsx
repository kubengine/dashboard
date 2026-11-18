import PageHeading from '@/components/PageHeading';
import services from '@/services';
import { App } from '@/services/AppController';
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { history, Link } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Pagination,
  Skeleton,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

const categories = [
  { key: '', label: '全部应用', icon: <AppstoreOutlined aria-hidden="true" /> },
  {
    key: '数据库',
    label: '数据库',
    icon: <DatabaseOutlined aria-hidden="true" />,
  },
  {
    key: '消息与集成',
    label: '消息与集成',
    icon: <MessageOutlined aria-hidden="true" />,
  },
  {
    key: '应用支撑',
    label: '应用支撑',
    icon: <ToolOutlined aria-hidden="true" />,
  },
];
const AppIcon: React.FC<{ name: string }> = ({ name }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="ke-app-icon">
      {failed ? (
        <AppstoreOutlined aria-hidden="true" />
      ) : (
        <img
          src={`/app_logo/${name.toLowerCase()}_logo.png`}
          alt=""
          width={36}
          height={36}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};
const Store: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPagination((value) => ({ ...value, current: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    services.AppsController.list(
      query,
      pagination.pageSize,
      pagination.current,
      activeCategory,
    )
      .then(({ code, data }) => {
        if (code != 200) throw new Error('加载失败');
        if (active) {
          setApps(data.data || []);
          setTotal(data.total || 0);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pagination, query, activeCategory, revision]);
  return (
    <>
      <PageHeading
        eyebrow="APPLICATIONS / CATALOG"
        title="应用库"
        description="发现经过配置的云原生应用，从选择到部署，一步开启。"
        extra={
          <Button
            icon={<PlusOutlined aria-hidden="true" />}
            onClick={() => history.push('/apps/editor')}
          >
            注册应用
          </Button>
        }
      />
      <div className="ke-hero-note">
        <DeploymentUnitOutlined aria-hidden="true" />
        <span>标准 Helm 模板与可视化参数配置，让应用部署更简单。</span>
        <Link to="/apps/cluster">
          管理已部署应用 <ArrowRightOutlined aria-hidden="true" />
        </Link>
      </div>
      <div className="ke-catalog-controls">
        <div className="ke-catalog-tabs" role="group" aria-label="应用分类">
          {categories.map((category) => (
            <button
              type="button"
              key={category.key}
              className="ke-category"
              aria-pressed={category.key === activeCategory}
              onClick={() => {
                setActiveCategory(category.key);
                setPagination((value) => ({ ...value, current: 1 }));
              }}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>
        <Input
          aria-label="搜索应用"
          placeholder="搜索应用名称"
          prefix={<SearchOutlined aria-hidden="true" />}
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {failed ? (
        <Alert
          type="error"
          showIcon
          message="应用列表加载失败"
          action={
            <Button
              size="small"
              onClick={() => setRevision((value) => value + 1)}
            >
              重试
            </Button>
          }
        />
      ) : loading ? (
        <div className="ke-catalog-grid">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <Card key={key}>
              <Skeleton active avatar paragraph={{ rows: 3 }} />
            </Card>
          ))}
        </div>
      ) : apps.length ? (
        <div className="ke-catalog-grid">
          {apps.map((app) => (
            <Card key={app.app_id} className="ke-app-card">
              <div className="ke-app-identity">
                <AppIcon name={app.name} />
                <div>
                  <h2>{app.name}</h2>
                  <div className="ke-app-type">HELM APPLICATION</div>
                </div>
              </div>
              <p className="ke-app-description">
                {app.description || '通过 Helm 模板部署和管理应用。'}
              </p>
              <div className="ke-app-footer">
                <span>
                  {app.category?.map((category) => (
                    <Tag key={category}>{category}</Tag>
                  ))}
                </span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => history.push(`/apps/deploy/${app.app_id}`)}
                  aria-label={`部署 ${app.name}`}
                >
                  部署应用 <ArrowRightOutlined aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              query || activeCategory
                ? '没有匹配的应用，请调整搜索条件'
                : '暂无应用，请先注册应用'
            }
          />
        </Card>
      )}
      {!failed && (
        <div className="ke-catalog-pagination">
          <span role="status">
            共 {total} 个应用{activeCategory && ` · ${activeCategory}`}
          </span>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(current) =>
              setPagination((value) => ({ ...value, current }))
            }
          />
        </div>
      )}
    </>
  );
};
export default Store;
