import YamlDisplay from '@/components/YamlDisplay';
import services from '@/services';
import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

type ArtifactDetailParams = {
  project_name: string;
  repository_name: string;
  digest: string;
} & Record<string, string | undefined>;

const ArtifactDetailPage: React.FC = () => {
  const params = useParams<ArtifactDetailParams>();
  const project_name = params.project_name;
  const repository_name = params.repository_name;
  const digest = params.digest;
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [yamlText, setYamlText] = useState<string>('');
  const [artifactData, setArtifactData] = useState<any>();
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
  const copyConfig = (tag: string) => {
    var configStr = '';
    if (artifactData.type == 'CHART') {
      configStr = `helm pull oci://kubekylin.io/${project_name}/${repository_name} --version ${tag}`;
    } else {
      configStr = `ctr i pull kubekylin.io/${project_name}/${repository_name}:${tag}`;
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
  const fetchArtifact = async () => {
    setLoading(true);
    const { code, data } = await services.ArtifactsController.get_artifact(
      project_name || '',
      encodeURIComponent(encodeURIComponent(repository_name || '')),
      digest || '',
    );
    if (code == 200) {
      setArtifactData(data);
      if (data.type == 'CHART') {
        const { code, data } = await services.ArtifactsController.chart_values(
          project_name || '',
          encodeURIComponent(encodeURIComponent(repository_name || '')),
          digest || '',
        );
        if (code == 200) {
          setYamlText(data);
        } else {
          message.error('获取chart values.yaml失败');
        }
      }
    } else {
      message.error('获取Tags失败');
    }
    setLoading(false);
  };
  // 初始加载
  useEffect(() => {
    fetchArtifact();
  }, []);
  const handleDeleteTag = async (name: string) => {
    setConfirmLoading(true);
    const { code } = await services.ArtifactsController.del_artifact_tag(
      project_name || '',
      encodeURIComponent(encodeURIComponent(repository_name || '')),
      digest || '',
      name,
    );
    if (code == 200) {
      message.success('Tag删除成功');
      fetchArtifact(); // 重新加载列表
    } else {
      message.error('删除Tag失败');
    }
    setConfirmLoading(false);
  };
  const tagColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name: string) => (
        <>
          <Tag color={name == 'CHART' ? 'cyan' : 'blue'}>{name}</Tag>
          <Button
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={() => copyConfig(name)}
          >
            {copied ? '已复制' : '复制拉取命令'}
          </Button>
        </>
      ),
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
            title="确定要删除这个Tag吗？"
            onConfirm={() => handleDeleteTag(record.name)}
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
  const handleAddTagOpen = () => {
    setTagModalVisible(true);
    // 重置表单（避免上次输入残留）
    form.resetFields();
  };

  /** 关闭新增 TAG 对话框 */
  const handleAddTagClose = () => {
    setTagModalVisible(false);
    setConfirmLoading(false);
  };

  /** 提交新增 TAG 表单 */
  const [tagModalVisible, setTagModalVisible] = useState<boolean>(false); // 对话框显隐
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false); // 提交加载状态
  const [form] = Form.useForm(); // 表单实例
  const handleAddTagSubmit = async () => {
    try {
      // 1. 表单校验
      const values = await form.validateFields();
      const newTagName = values.tagName.trim();

      // 2. 校验 TAG 名称是否已存在
      const isExist = artifactData.tags.some(
        (item: any) => item.name === newTagName,
      );
      if (isExist) {
        message.warning(`TAG ${newTagName} 已存在，请勿重复添加`);
        return;
      }

      // 3. 提交接口（替换为实际接口）
      setConfirmLoading(true);
      const { code } = await services.ArtifactsController.add_artifact_tag(
        project_name || '',
        encodeURIComponent(encodeURIComponent(repository_name || '')),
        digest || '',
        newTagName,
      );

      // 4. 处理接口响应
      if (code === 201) {
        message.success(`TAG ${newTagName} 添加成功`);
        fetchArtifact();
        handleAddTagClose();
      } else {
        message.error('添加 TAG 失败，请重试');
      }
    } catch (error) {
      // 表单校验失败或接口异常
      console.error('添加 TAG 出错：', error);
      message.error('添加 TAG 失败，请检查输入');
    } finally {
      setConfirmLoading(false);
    }
  };
  return (
    <PageContainer>
      {/* 顶部 TAG 操作区 */}
      <Card title="Tags">
        <Space
          style={{
            width: '100%', // 必须占满宽度
            justifyContent: 'flex-end', // 核心：水平靠右
          }}
        >
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleAddTagOpen}
          >
            添加TAG
          </Button>
        </Space>

        {/* TAG 列表表格 */}
        <Spin spinning={loading}>
          <Table
            dataSource={artifactData?.tags}
            columns={tagColumns}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1100 }}
            size="middle"
            locale={{
              emptyText: <Empty description="未发现任何 Tag!" />,
            }}
          />
        </Spin>
      </Card>

      <Divider />

      {/* 属性总览区域 */}
      <Card title="属性总览">
        <Descriptions
          column={1}
          bordered
          size="small"
          contentStyle={{ whiteSpace: 'pre-wrap' }}
        >
          {Object.entries(artifactData?.extra_attrs || {}).map(
            ([key, value]) => {
              if (key !== 'annotations') {
                return (
                  <Descriptions.Item
                    label={key}
                    span={2}
                    children={`${
                      typeof value === 'object' ? JSON.stringify(value) : value
                    }`}
                  />
                );
              }
            },
          )}
          {Object.entries(artifactData?.annotations || {}).map(
            ([key, value]) => {
              return (
                <Descriptions.Item
                  label={key}
                  span={2}
                  children={`${
                    typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : value
                  }`}
                />
              );
            },
          )}
        </Descriptions>
      </Card>
      
      <YamlDisplay yamlText={yamlText} title="values.yaml"  hidden={artifactData?.type != 'CHART'}/>

      <Modal
        title="新增 TAG"
        open={tagModalVisible}
        onOk={handleAddTagSubmit}
        onCancel={handleAddTagClose}
        confirmLoading={confirmLoading}
        destroyOnHidden={true} // 关闭时销毁表单，避免缓存
        maskClosable={false} // 点击遮罩层不关闭
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ tagName: '' }} // 表单初始值
        >
          <Form.Item
            name="tagName"
            label="TAG 名称"
            rules={[
              { required: true, message: '请输入 TAG 名称' },
              {
                pattern: /^[a-zA-Z0-9_\-.]+$/, // 限制 TAG 名称格式（可自定义）
                message: 'TAG 名称仅允许字母、数字、下划线、横杠、点',
              },
              { max: 64, message: 'TAG 名称长度不超过 64 个字符' },
            ]}
          >
            <Input
              placeholder="请输入 TAG 名称（如：v1.0.0、latest）"
              maxLength={64}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ArtifactDetailPage;
