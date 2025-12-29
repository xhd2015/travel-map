import { useEffect, useState } from 'react';
import { Layout, List, Card, Button, Input, Modal, Typography, Popconfirm, Spin, Empty, Form, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, RightOutlined, EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import type { Destination } from './api';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export default function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDestName, setNewDestName] = useState('');

  // Editing state
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (planId) {
      loadDestinations();
    }
  }, [planId]);

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

  if (!planId) return <div>Invalid Plan ID</div>;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginRight: 16 }}>返回计划列表</Button>
        <Title level={3} style={{ margin: 0 }}>目的地管理</Title>
      </Header>
      <Content style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
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
      </Content>
      <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
    </Layout>
  );
}
