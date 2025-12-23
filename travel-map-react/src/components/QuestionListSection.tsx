import { useState } from 'react';
import { Card, Button, Form, Input, List, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Question } from '../api';

interface QuestionListSectionProps {
    questions: Question[];
    onSave: (q: Question[]) => void;
}

export const QuestionListSection = ({ questions, onSave }: QuestionListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (id: string) => id === editingKey;

    const edit = (record: Question) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.id);
        if (newRowId === record.id) {
            // keep
        } else {
            setNewRowId(null);
        }
    };

    const handleDelete = (key: string) => {
        const newData = questions.filter((item) => item.id !== key);
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
            const row = (await form.validateFields()) as Question;
            const newData = [...questions];
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
        const newQuestion: Question = {
            id: newKey,
            question: '',
            answer: '',
        };
        onSave([...questions, newQuestion]);
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newQuestion);
    };

    return (
        <Card title="问题列表" variant="borderless">
            <Form form={form} component={false}>
                <List
                    itemLayout="vertical"
                    dataSource={questions}
                    renderItem={(item) => {
                        const editable = isEditing(item.id);
                        return (
                            <List.Item
                                key={item.id}
                                actions={[
                                    editable ? (
                                        <Space key="save-cancel">
                                            <a onClick={() => save(item.id)}><SaveOutlined /> 保存</a>
                                            <Popconfirm title="确定取消吗?" onConfirm={cancel}>
                                                <a style={{ color: 'gray' }}><CloseOutlined /> 取消</a>
                                            </Popconfirm>
                                        </Space>
                                    ) : (
                                        <Space key="edit-delete">
                                            <a onClick={() => edit(item)}><EditOutlined /> 编辑</a>
                                            <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(item.id)}>
                                                <a style={{ color: 'red' }}><DeleteOutlined /> 删除</a>
                                            </Popconfirm>
                                        </Space>
                                    )
                                ]}
                            >
                                {editable ? (
                                    <>
                                        <Form.Item name="question" label="问题" rules={[{ required: true, message: '请输入问题' }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="answer" label="回答">
                                            <Input.TextArea rows={4} />
                                        </Form.Item>
                                    </>
                                ) : (
                                    <List.Item.Meta
                                        title={<span style={{ fontWeight: 'bold' }}>问: {item.question}</span>}
                                        description={<span style={{ whiteSpace: 'pre-wrap' }}>答: {item.answer}</span>}
                                    />
                                )}
                            </List.Item>
                        );
                    }}
                    footer={
                        <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                            添加问题
                        </Button>
                    }
                />
            </Form>
        </Card>
    );
};
