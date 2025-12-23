import { useState } from 'react';
import { Card, Button, Form, Input, List, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import type { Reference } from '../api';

interface ReferenceListSectionProps {
    references: Reference[];
    onSave: (r: Reference[]) => void;
}

export const ReferenceListSection = ({ references, onSave }: ReferenceListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (id: string) => id === editingKey;

    const edit = (record: Reference) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.id);
        if (newRowId === record.id) {
            // keep
        } else {
            setNewRowId(null);
        }
    };

    const handleDelete = (key: string) => {
        const newData = references.filter((item) => item.id !== key);
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
            const row = (await form.validateFields()) as Reference;
            const newData = [...references];
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
        const newReference: Reference = {
            id: newKey,
            description: '',
            link: '',
        };
        onSave([...references, newReference]);
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newReference);
    };

    return (
        <Card title="参考资料" variant="borderless">
            <Form form={form} component={false}>
                <List
                    itemLayout="vertical"
                    dataSource={references}
                    renderItem={(item) => {
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
                                            <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(item.id)}>
                                                <a style={{ color: 'red' }}><DeleteOutlined /> 删除</a>
                                            </Popconfirm>
                                        </Space>
                                    )
                                ]}
                            >
                                {editable ? (
                                    <>
                                        <Form.Item name="description" label="描述信息" rules={[{ required: true, message: '请输入描述信息' }]}>
                                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 10 }} />
                                        </Form.Item>
                                        <Form.Item name="link" label="相关链接">
                                            <Input />
                                        </Form.Item>
                                    </>
                                ) : (
                                    <List.Item.Meta
                                        title={<ReactMarkdown remarkPlugins={[remarkBreaks]}>{item.description}</ReactMarkdown>}
                                        description={
                                            item.link ? (
                                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                                    {item.link}
                                                </a>
                                            ) : (
                                                '无链接'
                                            )
                                        }
                                    />
                                )}
                            </List.Item>
                        );
                    }}
                    footer={
                        <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                            添加参考资料
                        </Button>
                    }
                />
            </Form>
        </Card>
    );
};

