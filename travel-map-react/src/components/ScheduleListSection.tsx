import { useState } from 'react';
import { Card, Button, Form, Input, List, Space, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import type { Schedule } from '../api';

interface ScheduleListSectionProps {
    schedules: Schedule[];
    onSave: (s: Schedule[]) => void;
}

export const ScheduleListSection = ({ schedules, onSave }: ScheduleListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (id: string) => id === editingKey;

    const edit = (record: Schedule) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.id);
        if (newRowId === record.id) {
            // keep
        } else {
            setNewRowId(null);
        }
    };

    const handleDelete = (key: string) => {
        const newData = schedules.filter((item) => item.id !== key);
        onSave(newData);
        if (key === newRowId) {
            setNewRowId(null);
        }
    };

    const cancel = () => {
        if (editingKey === newRowId) {
            handleDelete(editingKey);
        }
        setEditingKey('');
        setNewRowId(null);
    };

    const save = async (key: string) => {
        try {
            const row = (await form.validateFields()) as Schedule;
            const newData = [...schedules];
            const index = newData.findIndex((item) => key === item.id);

            if (index > -1) {
                const item = newData[index];
                newData.splice(index, 1, { ...item, ...row });
                onSave(newData);
                setEditingKey('');
                setNewRowId(null);
            }
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newSchedule: Schedule = {
            id: newKey,
            content: '',
        };
        onSave([...schedules, newSchedule]);
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newSchedule);
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newData = [...schedules];
        const temp = newData[index];
        newData[index] = newData[index - 1];
        newData[index - 1] = temp;
        onSave(newData);
    };

    const moveDown = (index: number) => {
        if (index === schedules.length - 1) return;
        const newData = [...schedules];
        const temp = newData[index];
        newData[index] = newData[index + 1];
        newData[index + 1] = temp;
        onSave(newData);
    };

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>计划</span>
            <Tooltip title="先搜索景点，再确定导览图，最后确定行程表">
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    return (
        <Card title={title} bordered={false}>
            <Form form={form} component={false}>
                <List
                    itemLayout="vertical"
                    dataSource={schedules}
                    renderItem={(item, index) => {
                        const editable = isEditing(item.id);
                        return (
                            <List.Item
                                key={item.id}
                                actions={[
                                    editable ? (
                                        <Space key="save-cancel">
                                            <a onClick={() => save(item.id)}><SaveOutlined /> 保存</a>
                                            <a onClick={cancel} style={{ color: 'gray' }}><CloseOutlined /> 取消</a>
                                        </Space>
                                    ) : (
                                        <Space key="edit-delete">
                                            <a onClick={() => edit(item)}><EditOutlined /> 编辑</a>
                                            <a onClick={() => moveUp(index)} style={{ color: index === 0 ? 'lightgray' : undefined, cursor: index === 0 ? 'default' : 'pointer' }}><ArrowUpOutlined /> 上移</a>
                                            <a onClick={() => moveDown(index)} style={{ color: index === schedules.length - 1 ? 'lightgray' : undefined, cursor: index === schedules.length - 1 ? 'default' : 'pointer' }}><ArrowDownOutlined /> 下移</a>
                                            <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(item.id)}>
                                                <a style={{ color: 'red' }}><DeleteOutlined /> 删除</a>
                                            </Popconfirm>
                                        </Space>
                                    )
                                ]}
                            >
                                {editable ? (
                                    <Form.Item name="content" rules={[{ required: true, message: '请输入内容' }]}>
                                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 10 }} />
                                    </Form.Item>
                                ) : (
                                    <div style={{ color: 'rgba(0, 0, 0, 0.88)' }}>
                                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                                            {item.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </List.Item>
                        );
                    }}
                    footer={
                        <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                            添加计划
                        </Button>
                    }
                />
            </Form>
        </Card>
    );
};

