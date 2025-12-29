import { useEffect, useState } from 'react';
import { Layout, List, Card, Button, Input, Modal, Typography, Popconfirm, Spin, Empty, Form, Upload, Table, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, RightOutlined, EditOutlined, ExportOutlined, ImportOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import type { Plan, FullPlan } from './api';

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

    // Import state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importedPlans, setImportedPlans] = useState<FullPlan[]>([]);
    const [importData, setImportData] = useState<{ key: string; name: string; status: string; statusText: string }[]>([]);
    const [selectedImportIndices, setSelectedImportIndices] = useState<React.Key[]>([]);
    const [hasConflict, setHasConflict] = useState(false);

    // Export state
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedExportPlanIds, setSelectedExportPlanIds] = useState<React.Key[]>([]);

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
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newPlanName) return;
        const plan = await api.createPlan(newPlanName);
        // Reload to resort
        loadPlans();
        setIsCreating(false);
        setNewPlanName('');
        navigate(`/plans/${plan.id}`);
    };

    const handleDelete = async (id: string) => {
        await api.deletePlan(id);
        setPlans(plans.filter(p => p.id !== id));
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        editForm.setFieldsValue(plan);
        setIsEditModalOpen(true);
    };

    const handleUpdate = async () => {
        const values = await editForm.validateFields();
        if (editingPlan) {
            await api.updatePlan(editingPlan.id, values);
            setIsEditModalOpen(false);
            setEditingPlan(null);
            loadPlans();
        }
    };

    const handleExport = () => {
        setSelectedExportPlanIds(plans.map(p => p.id));
        setIsExportModalOpen(true);
    };

    const confirmExport = () => {
        api.exportPlans(selectedExportPlanIds as string[]);
        setIsExportModalOpen(false);
    };

    const handleImportFile = async (file: File) => {
        try {
            const text = await file.text();
            const parsedPlans: FullPlan[] = JSON.parse(text);

            if (!Array.isArray(parsedPlans)) {
                throw new Error("Invalid format: expected array of plans");
            }

            setImportedPlans(parsedPlans);

            let foundConflict = false;
            const data = parsedPlans.map((p, index) => {
                const isConflict = plans.some(existing => existing.name === p.plan.name);
                if (isConflict) foundConflict = true;
                return {
                    key: index.toString(),
                    name: p.plan.name,
                    status: isConflict ? 'conflict' : 'new',
                    statusText: isConflict ? '冲突 (已存在同名计划)' : '新增',
                };
            });

            setImportData(data);
            setHasConflict(foundConflict);
            setSelectedImportIndices(data.map(d => d.key));
        } catch (e) {
            console.error("Import failed", e);
            throw e; // Global handler will catch
        }
        return false; // Prevent automatic upload
    };

    const confirmImport = async () => {
        const plansToImport = importedPlans.filter((_, index) => selectedImportIndices.includes(index.toString()));
        await api.importPlans(plansToImport);
        setIsImportModalOpen(false);
        setImportedPlans([]);
        setImportData([]);
        setSelectedImportIndices([]);
        loadPlans();
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
                <Title level={3} style={{ margin: '16px 0' }}>我的旅行计划</Title>
            </Header>
            <Content style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>导入</Button>
                    <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
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

                <Modal
                    title="导入计划"
                    open={isImportModalOpen}
                    onOk={confirmImport}
                    onCancel={() => {
                        setIsImportModalOpen(false);
                        setImportedPlans([]);
                        setImportData([]);
                        setSelectedImportIndices([]);
                        setHasConflict(false);
                    }}
                    okText="确认导入"
                    cancelText="取消"
                    okButtonProps={{ disabled: hasConflict || importedPlans.length === 0 || selectedImportIndices.length === 0 }}
                    width={600}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Upload
                            beforeUpload={handleImportFile}
                            showUploadList={false}
                            accept=".json"
                        >
                            <Button icon={<UploadOutlined />}>选择文件 (.json)</Button>
                        </Upload>

                        {importData.length > 0 && (
                            <Table
                                rowSelection={{
                                    selectedRowKeys: selectedImportIndices,
                                    onChange: (newSelectedRowKeys) => setSelectedImportIndices(newSelectedRowKeys),
                                }}
                                dataSource={importData}
                                pagination={false}
                                size="small"
                                columns={[
                                    { title: '计划名称', dataIndex: 'name', key: 'name' },
                                    {
                                        title: '状态',
                                        dataIndex: 'statusText',
                                        key: 'status',
                                        render: (_, record) => (
                                            <Tag color={record.status === 'conflict' ? 'red' : 'green'}>
                                                {record.statusText}
                                            </Tag>
                                        )
                                    }
                                ]}
                            />
                        )}
                    </Space>
                </Modal>

                <Modal
                    title="导出计划"
                    open={isExportModalOpen}
                    onOk={confirmExport}
                    onCancel={() => setIsExportModalOpen(false)}
                    okText="导出"
                    cancelText="取消"
                    width={600}
                >
                    <Table
                        rowSelection={{
                            selectedRowKeys: selectedExportPlanIds,
                            onChange: (newSelectedRowKeys) => setSelectedExportPlanIds(newSelectedRowKeys),
                        }}
                        columns={[
                            { title: '计划名称', dataIndex: 'name', key: 'name' },
                            { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text) => new Date(text).toLocaleString() },
                        ]}
                        dataSource={plans.map(p => ({ ...p, key: p.id }))}
                        pagination={false}
                        size="small"
                        scroll={{ y: 400 }}
                    />
                </Modal>
            </Content>
            <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
        </Layout>
    );
}
