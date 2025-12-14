import { useEffect, useState } from 'react';
import { Layout, List, Card, Button, Input, Modal, Typography, Popconfirm, Spin, Empty, Form, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, RightOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import type { Plan } from './api';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export default function PlanList() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');
    
    // Editing state
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm] = Form.useForm();

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await api.getPlans();
            // Sort by order if present, otherwise by created_at desc (newest first)
            // Wait, requirement: default by created time. If order set, by order.
            // Let's implement robust sorting:
            // 1. Filter plans with order > 0 and order = 0 (or undefined)
            // 2. Sort "ordered" plans by order ascending.
            // 3. Sort "unordered" plans by created_at descending (or ascending? usually newest first is better)
            // 4. Combine: ordered first, then unordered? Or how?
            // "如果设置了序号，则按序号排序" implies precedence.
            // Let's assume order > 0 means "pinned" or "ordered". 0 means default.
            // We sort by: Order (asc, non-zero), then CreatedAt (desc/asc).
            // Actually, usually users want custom ordered items at top.
            
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
            
            setPlans(sorted);
        } catch (e) {
            console.error("Failed to load plans", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newPlanName) return;
        try {
            const plan = await api.createPlan(newPlanName);
            // Reload to resort
            loadPlans();
            setIsCreating(false);
            setNewPlanName('');
            navigate(`/plan/${plan.id}`);
        } catch (e) {
            console.error("Failed to create plan", e);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deletePlan(id);
            setPlans(plans.filter(p => p.id !== id));
        } catch (e) {
            console.error("Failed to delete plan", e);
        }
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        editForm.setFieldsValue(plan);
        setIsEditModalOpen(true);
    };

    const handleUpdate = async () => {
        try {
            const values = await editForm.validateFields();
            if (editingPlan) {
                await api.updatePlan(editingPlan.id, values);
                setIsEditModalOpen(false);
                setEditingPlan(null);
                loadPlans();
            }
        } catch (e) {
            console.error("Failed to update plan", e);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
                <Title level={3} style={{ margin: '16px 0' }}>我的旅行计划</Title>
            </Header>
            <Content style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreating(true)}>
                        创建新计划
                    </Button>
                </div>

                {plans.length === 0 ? (
                    <Empty description="暂无计划，快创建一个吧！" />
                ) : (
                    <List
                        grid={{ gutter: 16, column: 1 }}
                        dataSource={plans}
                        renderItem={(item) => (
                            <List.Item>
                                <Card
                                    hoverable
                                    actions={[
                                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)}>编辑</Button>,
                                        <Popconfirm title="确定删除该计划吗?" onConfirm={() => handleDelete(item.id)} okText="是" cancelText="否">
                                            <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                                        </Popconfirm>,
                                        <Button type="link" onClick={() => navigate(`/plan/${item.id}`)}>
                                            进入计划 <RightOutlined />
                                        </Button>
                                    ]}
                                >
                                    <Card.Meta
                                        title={
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '1.2em' }}>{item.name}</span>
                                                {item.order && item.order > 0 ? <span style={{ fontSize: '0.8em', color: '#999' }}>序号: {item.order}</span> : null}
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
                    title="创建新计划"
                    open={isCreating}
                    onOk={handleCreate}
                    onCancel={() => setIsCreating(false)}
                    okText="创建"
                    cancelText="取消"
                >
                    <Input
                        placeholder="请输入计划名称"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        onPressEnter={handleCreate}
                    />
                </Modal>

                <Modal
                    title="编辑计划"
                    open={isEditModalOpen}
                    onOk={handleUpdate}
                    onCancel={() => setIsEditModalOpen(false)}
                    okText="保存"
                    cancelText="取消"
                >
                    <Form form={editForm} layout="vertical">
                        <Form.Item name="name" label="计划名称" rules={[{ required: true }]}>
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
