import PageHeading from '@/components/PageHeading';
import { audit_events } from '@/services/IdentityController';
import { auditActionLabel, auditActionOptions } from '@/utils/auditActions';
import { getRequestErrorMessage } from '@/utils/request';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

export default function Audit() {
  const [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState<any>();
  const [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm();
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    audit_events({ ...filters, page, page_size: size })
      .then(({ data }) => {
        if (active) {
          setRows(data.items);
          setTotal(data.total);
        }
      })
      .catch((error) => {
        if (active) setError(getRequestErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, page, size, refresh]);
  const resultLabels: Record<string, string> = {
    success: '成功',
    failed: '失败',
    denied: '拒绝',
    pending: '结果待核实',
    partial: '部分完成',
    accepted: '集群已接受',
    rejected: '未执行或已拒绝',
    unknown: '写入待核实',
  };
  return (
    <>
      <PageHeading
        eyebrow="OPERATION AUDIT"
        title="操作审计"
        description="按身份、动作与资源核对操作结果；审计不记录密码、Secret 明文或终端内容。"
        extra={<Button onClick={() => setRefresh((v) => v + 1)}>刷新</Button>}
      />
      <Card>
        <Form
          form={form}
          layout="vertical"
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
          onFinish={(values) => {
            const { time, ...other } = values;
            setFilters({
              ...other,
              since: time?.[0]?.unix(),
              until: time?.[1]?.unix(),
            });
            setPage(1);
          }}
        >
          {[
            'username',
            'action',
            'namespace',
            'resource_type',
            'resource_name',
            'request_id',
            'task_id',
            'batch_id',
          ].map((key, index) => (
            <Form.Item
              key={key}
              name={key}
              label={
                [
                  '用户名',
                  '动作',
                  '命名空间',
                  '资源类型',
                  '资源名称',
                  '请求编号',
                  '任务编号',
                  '批次编号',
                ][index]
              }
            >
              {key === 'action' ? (
                <Select
                  allowClear
                  showSearch
                  placeholder="选择或搜索动作"
                  options={auditActionOptions}
                  filterOption={(input, option) =>
                    `${option?.label} ${option?.value}`
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              ) : (
                <Input allowClear style={{ width: 160 }} />
              )}
            </Form.Item>
          ))}
          <Form.Item name="result" label="结果">
            <Select
              allowClear
              style={{ width: 150 }}
              options={Object.entries(resultLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
          <Form.Item name="time" label="时间范围">
            <DatePicker.RangePicker
              showTime
              style={{ width: '100%', minWidth: 0 }}
            />
          </Form.Item>
          <Space>
            <Button htmlType="submit" type="primary">
              查询
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setFilters({});
                setPage(1);
              }}
            >
              重置
            </Button>
          </Space>
        </Form>
        {error && <Alert role="alert" type="error" showIcon message={error} />}
        <Table
          rowKey="event_id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 1100 }}
          columns={[
            {
              title: '时间',
              dataIndex: 'created_at',
              render: (v: number) => new Date(v * 1000).toLocaleString(),
            },
            { title: '操作者', dataIndex: 'username' },
            { title: '动作', dataIndex: 'action', render: auditActionLabel },
            { title: '命名空间', dataIndex: 'namespace' },
            {
              title: '资源',
              render: (_, row) =>
                `${row.resource_type || '—'} / ${row.resource_name || '—'}`,
            },
            {
              title: '结果',
              dataIndex: 'result',
              render: (v: string) => (
                <Tag
                  color={
                    v === 'accepted'
                      ? 'blue'
                      : v === 'success'
                      ? 'green'
                      : v === 'denied'
                      ? 'orange'
                      : v === 'pending' || v === 'unknown'
                      ? 'gold'
                      : 'red'
                  }
                >
                  {resultLabels[v] || v}
                </Tag>
              ),
            },
            { title: '请求编号', dataIndex: 'request_id', ellipsis: true },
            {
              title: '详情',
              render: (_, row) => (
                <Button type="link" onClick={() => setSelected(row)}>
                  查看详情
                </Button>
              ),
            },
          ]}
          pagination={{
            current: page,
            pageSize: size,
            total,
            showSizeChanger: true,
            onChange: (page, size) => {
              setPage(page);
              setSize(size);
            },
          }}
        />
      </Card>
      <Drawer
        title="审计详情"
        open={!!selected}
        onClose={() => setSelected(undefined)}
        width={560}
      >
        <Descriptions
          column={1}
          bordered
          items={
            selected
              ? Object.entries(selected).map(([key, value]) => ({
                  key,
                  label:
                    (
                      {
                        event_id: '事件编号',
                        created_at: '发生时间',
                        completed_at: '完成时间',
                        actor_id: '用户标识',
                        username: '操作者',
                        action: '动作',
                        namespace: '命名空间',
                        resource_type: '资源类型',
                        resource_name: '资源名称',
                        source_ip: '来源地址',
                        request_id: '请求编号',
                        result: '结果',
                        status_code: '响应状态',
                        task_id: '任务编号',
                        batch_id: '批次编号',
                        revision_id: '版本编号',
                        parent_id: '上级事件',
                      } as Record<string, string>
                    )[key] || key,
                  children:
                    key === 'action'
                      ? auditActionLabel(String(value ?? ''))
                      : key === 'result'
                      ? resultLabels[String(value)] || String(value ?? '—')
                      : key.endsWith('_at') && value
                      ? new Date(Number(value) * 1000).toLocaleString()
                      : String(value ?? '—'),
                }))
              : []
          }
        />
      </Drawer>
    </>
  );
}
