import service from '@/services';
import { formatBytes } from '@/utils/storage';
import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Empty,
  Input,
  message,
  PaginationProps,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

type ListParams = {
  project_name: string;
  repository_name: string;
} & Record<string, string | undefined>;

const ArtifactsList: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [paginationParams, setPaginationParams] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });
  const params = useParams<ListParams>();
  const project_name = params.project_name;
  const repository_name = params.repository_name;
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<any[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const fetchArtifacts = async (current = 1, pageSize = 10) => {
    setLoading(true);
    const { code, data } = await service.ArtifactsController.get_artifacts(
      project_name || '',
      encodeURIComponent(encodeURIComponent(repository_name || '')),
      searchText ? `digest${encodeURIComponent('=')}~${searchText}` : '',
      pageSize,
      current,
    );
    if (code == 200) {
      setData(data);
      if (searchText) {
        setCount(data.length);
      }
    } else {
      message.error(`获取${project_name}仓库制品失败`);
    }
    setLoading(false);
  };
  const handleTableChange: PaginationProps['onChange'] = (
    current: number, // 当前页码
    pageSize: number, // 每页条数
  ) => {
    setPaginationParams({ current, pageSize });

    fetchArtifacts(current, pageSize);
  };
  // 切换标签展开状态
  const toggleLabelExpansion = (key: string) => {
    setExpandedTags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const renderTags = (labels: any[], record_id: string) => {
    if (!labels) {
      return;
    }
    const tagArray = labels.map((item) => item.name);
    const isExpanded = expandedTags[record_id] || false;
    const maxDisplayCount = 3;

    // 显示的标签
    const displayLabels = isExpanded
      ? tagArray
      : tagArray.slice(0, maxDisplayCount);
    const hiddenCount = tagArray.length - maxDisplayCount;

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        {displayLabels.map((label, index) => (
          <Tag key={index} color="blue" style={{ margin: 0 }}>
            {label}
          </Tag>
        ))}

        {!isExpanded && hiddenCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={() => toggleLabelExpansion(record_id)}
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
            onClick={() => toggleLabelExpansion(record_id)}
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
      </div>
    );
  };
  // 初始加载
  useEffect(() => {
    fetchArtifacts();
  }, [searchText]);

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
  const copyConfig = (record: any) => {
    var configStr = '';
    if (record.type == 'CHART') {
      configStr = `helm pull oci://kubengine.io/${project_name}/${repository_name} --version ${record.extra_attrs.version}`;
    } else {
      configStr = `ctr i pull kubengine.io/${project_name}/${repository_name}@${record.digest}`;
    }
    copyToClipboard(configStr)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        message.success(`${configStr} 已复制到剪贴板`);
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
        message.error('自动复制失败，请手动复制内容');
      });
  };
  const handleDelete = async (digest: string) => {
    const { code, data } = await service.ArtifactsController.del_artifact(
      project_name || '',
      encodeURIComponent(encodeURIComponent(repository_name || '')),
      digest || '',
    );
    if (code == 200) {
      message.success('制品删除成功');
      fetchArtifacts()
    } else {
      message.error(`获取${project_name}仓库制品失败`);
    }
  };
  const columns = [
    {
      title: '制品名称',
      dataIndex: 'digest',
      key: 'digest',
      width: 150,
      render: (text: string, record: any) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              const r_repository_name = encodeURIComponent(
                repository_name || '',
              );
              history.push(
                `/artifacts/detail/${project_name}/${r_repository_name}/${text}`,
              );
            }}
          >
            {text}
          </Button>
          <Button
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={() => copyConfig(record)}
          >
            {copied ? '已复制' : '复制拉取命令'}
          </Button>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type == 'CHART' ? 'cyan' : 'blue'}>{type}</Tag>
      ),
    },
    {
      title: 'tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: any[], record: any) => renderTags(tags, record),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => {
        const res = formatBytes(size);
        return `${res.value}${res.unit}`;
      },
    },
    {
      title: '推送时间',
      dataIndex: 'push_time',
      key: 'push_time',
      width: 150,
      render: (push_time: number) =>
        dayjs(push_time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '拉取时间',
      dataIndex: 'pull_time',
      key: 'pull_time',
      width: 150,
      render: (pull_time: number) =>
        dayjs(pull_time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          <Popconfirm
            title="确定要删除这个镜像吗？"
            onConfirm={() => handleDelete(record.digest)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索制品名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      <Spin spinning={loading}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{
            ...paginationParams, // 绑定受控的分页参数
            showSizeChanger: true,
            total: count,
            onChange: handleTableChange, // 分页变化回调
          }}
          scroll={{ x: 1100 }}
          size="middle"
          locale={{
            emptyText: <Empty description="暂无制品数据" />,
          }}
        />
      </Spin>
    </PageContainer>
  );
};

export default ArtifactsList;
