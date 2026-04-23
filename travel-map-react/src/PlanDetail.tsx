import { useEffect, useState, useRef } from 'react';
import { Layout, List, Card, Button, Input, Modal, Typography, Popconfirm, Spin, Empty, Form, InputNumber, Timeline, DatePicker, TimePicker, Upload, message } from 'antd';
import { PlusOutlined, DeleteOutlined, RightOutlined, EditOutlined, ArrowLeftOutlined, ScheduleOutlined, ExportOutlined, ImportOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import type { Plan, Destination, PlanScheduleItem } from './api';
import dayjs from 'dayjs';
import AIChatPanel from './AIChatPanel';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export default function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDestName, setNewDestName] = useState('');

  // Editing state
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  // Description save timer
  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule state
  const [scheduleItems, setScheduleItems] = useState<PlanScheduleItem[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<PlanScheduleItem | null>(null);
  const [scheduleForm] = Form.useForm();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (planId) {
      loadPlan();
      loadDestinations();
      loadSchedule();
    }
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) return;
    const plans = await api.getPlans();
    const found = plans.find(p => p.id === planId);
    if (found) {
      setPlan(found);
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (!planId || !plan) return;
    setPlan({ ...plan, description: value });
    if (descTimerRef.current) {
      clearTimeout(descTimerRef.current);
    }
    descTimerRef.current = setTimeout(() => {
      api.updatePlan(planId, { description: value });
    }, 500);
  };

  const loadSchedule = async () => {
    if (!planId) return;
    const items = await api.getPlanSchedule(planId);
    setScheduleItems((items || []).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    }));
  };

  const handleAddScheduleItem = () => {
    setEditingScheduleItem(null);
    scheduleForm.resetFields();
    setIsScheduleModalOpen(true);
  };

  const handleEditScheduleItem = (item: PlanScheduleItem) => {
    setEditingScheduleItem(item);
    scheduleForm.setFieldsValue({
      date: item.date ? dayjs(item.date) : undefined,
      time: item.time ? dayjs(item.time, 'HH:mm') : undefined,
      title: item.title,
      description: item.description,
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveScheduleItem = async () => {
    if (!planId) return;
    const values = await scheduleForm.validateFields();
    const dateStr = values.date ? dayjs(values.date).format('YYYY-MM-DD') : '';
    const timeStr = values.time ? dayjs(values.time).format('HH:mm') : '';

    let updated: PlanScheduleItem[];
    if (editingScheduleItem) {
      updated = scheduleItems.map(item =>
        item.id === editingScheduleItem.id
          ? { ...item, date: dateStr, time: timeStr, title: values.title, description: values.description || '' }
          : item
      );
    } else {
      const newItem: PlanScheduleItem = {
        id: String(Date.now()),
        date: dateStr,
        time: timeStr,
        title: values.title,
        description: values.description || '',
      };
      updated = [...scheduleItems, newItem];
    }

    updated.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });

    setScheduleItems(updated);
    await api.savePlanSchedule(planId, updated);
    setIsScheduleModalOpen(false);
  };

  const handleDeleteScheduleItem = async (itemId: string) => {
    if (!planId) return;
    const updated = scheduleItems.filter(item => item.id !== itemId);
    setScheduleItems(updated);
    await api.savePlanSchedule(planId, updated);
  };

  const loadDestinations = async () => {
    if (!planId) return;
    try {
      const data = await api.getDestinations(planId);

      const sorted = (data || []).sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;

        if (orderA !== 0 && orderB !== 0) {
          return orderA - orderB;
        }
        if (orderA !== 0) return -1; // A has order, comes first
        if (orderB !== 0) return 1;  // B has order, comes first

        // Both 0, sort by created_at descending (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setDestinations(sorted);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newDestName || !planId) return;
    const dest = await api.createDestination(planId, newDestName);
    // Reload to resort
    loadDestinations();
    setIsCreating(false);
    setNewDestName('');
    navigate(`/plans/${planId}/destinations/${dest.id}`);
  };

  const handleDelete = async (destId: string) => {
    if (!planId) return;
    await api.deleteDestination(planId, destId);
    setDestinations(destinations.filter(d => d.id !== destId));
  };

  const handleEdit = (dest: Destination) => {
    setEditingDest(dest);
    editForm.setFieldsValue(dest);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!planId) return;
    const values = await editForm.validateFields();
    if (editingDest) {
      await api.updateDestination(planId, editingDest.id, values);
      setIsEditModalOpen(false);
      setEditingDest(null);
      loadDestinations();
    }
  };

  const handleExportZip = async () => {
    if (!planId) return;
    const fileName = `${(plan?.name || 'travel-plan').replace(/[\\/:*?"<>|]/g, '_')}.zip`;
    await api.exportPlanZip(planId, fileName);
  };

  const handleImportZip = async () => {
    if (!planId || !importFile) return;
    setImporting(true);
    try {
      await api.importPlanZip(planId, importFile);
      message.success('计划已从 zip 导入');
      setIsImportModalOpen(false);
      setImportFile(null);
      await Promise.all([loadPlan(), loadDestinations(), loadSchedule()]);
    } finally {
      setImporting(false);
    }
  };

  if (!planId) return <div>Invalid Plan ID</div>;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginRight: 16 }}>返回计划列表</Button>
        <Title level={3} style={{ margin: 0 }}>目的地管理</Title>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>导入</Button>
          <Button icon={<ExportOutlined />} onClick={handleExportZip}>导出</Button>
        </div>
      </Header>
      <Content style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {plan && (
          <Card style={{ marginBottom: 16 }}>
            <Title level={4} style={{ marginTop: 0 }}>{plan.name}</Title>
            <Input.TextArea
              placeholder="添加计划描述..."
              value={plan.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{ marginTop: 8 }}
            />
          </Card>
        )}

        <Card
          title={<><ScheduleOutlined style={{ marginRight: 8 }} />日程表</>}
          extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddScheduleItem}>添加日程</Button>}
          style={{ marginBottom: 16 }}
        >
          {scheduleItems.length === 0 ? (
            <Empty description="暂无日程安排" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={scheduleItems.map(item => ({
                children: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {item.date}{item.time ? ` ${item.time}` : ''} — {item.title}
                      </div>
                      {item.description && <div style={{ color: '#666', marginTop: 4 }}>{item.description}</div>}
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditScheduleItem(item)} />
                      <Popconfirm title="确定删除此日程？" onConfirm={() => handleDeleteScheduleItem(item.id)} okText="是" cancelText="否">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </Card>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreating(true)}>
            添加目的地
          </Button>
        </div>

        {destinations.length === 0 ? (
          <Empty description="暂无目的地，快创建一个吧！" />
        ) : (
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={destinations}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)}>编辑</Button>,
                    <Popconfirm title="确定删除该目的地吗?" onConfirm={() => handleDelete(item.id)} okText="是" cancelText="否">
                      <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>,
                    <Button type="link" onClick={() => navigate(`/plans/${planId}/destinations/${item.id}`)}>
                      进入详情 <RightOutlined />
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1.2em' }}>{item.name}</span>
                        {item.order !== undefined && item.order > 0 ? <span style={{ fontSize: '0.8em', color: '#999' }}>序号: {item.order}</span> : null}
                      </div>
                    }
                    description={`创建时间: ${new Date(item.created_at).toLocaleString()}`}
                  />
                </Card>
              </List.Item>
            )}
          />
        )}

        <Modal
          title="添加目的地"
          open={isCreating}
          onOk={handleCreate}
          onCancel={() => setIsCreating(false)}
          okText="创建"
          cancelText="取消"
        >
          <Input
            placeholder="请输入目的地名称"
            value={newDestName}
            onChange={(e) => setNewDestName(e.target.value)}
            onPressEnter={handleCreate}
          />
        </Modal>

        <Modal
          title="编辑目的地"
          open={isEditModalOpen}
          onOk={handleUpdate}
          onCancel={() => setIsEditModalOpen(false)}
          okText="保存"
          cancelText="取消"
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="order" label="序号 (越小越靠前，0表示默认)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={editingScheduleItem ? '编辑日程' : '添加日程'}
          open={isScheduleModalOpen}
          onOk={handleSaveScheduleItem}
          onCancel={() => setIsScheduleModalOpen(false)}
          okText="保存"
          cancelText="取消"
        >
          <Form form={scheduleForm} layout="vertical">
            <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="time" label="时间">
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="例如：出发、到达酒店、参观景点..." />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="备注信息..." autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="导入计划 zip"
          open={isImportModalOpen}
          onOk={handleImportZip}
          onCancel={() => {
            setIsImportModalOpen(false);
            setImportFile(null);
          }}
          okText="确认导入"
          cancelText="取消"
          okButtonProps={{ disabled: !importFile, loading: importing, danger: true }}
        >
          <p style={{ color: '#a8071a', marginTop: 0 }}>
            导入会覆盖当前计划下的目的地、日程和图片内容。
          </p>
          <Upload
            beforeUpload={(file) => {
              setImportFile(file);
              return false;
            }}
            showUploadList={false}
            accept=".zip,application/zip"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择 zip 文件</Button>
          </Upload>
          {importFile && (
            <div style={{ marginTop: 12, color: '#666' }}>
              已选择: {importFile.name}
            </div>
          )}
        </Modal>
      </Content>
      <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
      <AIChatPanel planId={planId} />
    </Layout>
  );
}
