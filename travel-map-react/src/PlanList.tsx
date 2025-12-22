import { useEffect, useState } from 'react';
import { Layout, List, Card, Button, Input, Modal, Typography, Popconfirm, Spin, Empty, Form } from 'antd';
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
            // Sort by created_at desc (newest first)
            const sorted = (data || []).sort((a, b) => {
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
            navigate(`/plans/${plan.id}`);
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
                                        <Button type="link" onClick={() => navigate(`/plans/${item.id}`)}>
                                            进入计划 <RightOutlined />
                                        </Button>
                                    ]}
                                >
                                    <Card.Meta
                                        title={<span style={{ fontSize: '1.2em' }}>{item.name}</span>}
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
                    </Form>
                </Modal>
            </Content>
            <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
        </Layout>
    );
}
