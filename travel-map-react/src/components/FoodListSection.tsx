import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Popconfirm, Space, Select, Tag, Popover, Rate } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Food } from '../api';

interface FoodListSectionProps {
    foods: Food[];
    onSave: (f: Food[]) => void;
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: string;
    inputType: 'text' | 'boolean' | 'rate';
    record: Food;
    index: number;
    children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    dataIndex,
    title,
    inputType,
    children,
    ...restProps
}) => {
    let inputNode = <Input />;
    if (inputType === 'boolean') {
        inputNode = (
            <Select>
                <Select.Option value={true}>是</Select.Option>
                <Select.Option value={false}>否</Select.Option>
            </Select>
        );
    } else if (inputType === 'rate') {
        inputNode = <Rate />;
    } else if (dataIndex === 'comment' || dataIndex === 'reservation_info') {
        inputNode = <Input.TextArea autoSize />;
    }

    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={[{ required: dataIndex === 'name', message: `请输入${title}!` }]}
                    valuePropName={inputType === 'boolean' ? 'value' : (inputType === 'rate' ? 'value' : 'value')}
                >
                    {inputNode}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

const ReservationDetails = ({ record, onSave }: { record: Food, onSave: (val: string) => void }) => {
    const [visible, setVisible] = useState(false);
    const [text, setText] = useState(record.reservation_info || '');
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setText(record.reservation_info || '');
    }, [record.reservation_info]);

    const handleSave = () => {
        onSave(text);
        setEditing(false);
    };

    const handleCancel = () => {
        setText(record.reservation_info || '');
        setEditing(false);
    };

    return (
        <Popover
            content={
                <div style={{ width: 300 }}>
                    {editing ? (
                        <>
                            <Input.TextArea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                autoSize={{ minRows: 3, maxRows: 6 }}
                            />
                            <div style={{ marginTop: 8, textAlign: 'right' }}>
                                <Space>
                                    <Button size="small" onClick={handleCancel}>取消</Button>
                                    <Button size="small" type="primary" onClick={handleSave}>保存</Button>
                                </Space>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 8, whiteSpace: 'pre-wrap', minHeight: '20px' }}>
                                {text || <span style={{ color: '#ccc' }}>暂无预约信息</span>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <Button size="small" type="link" onClick={() => setEditing(true)}>编辑</Button>
                            </div>
                        </>
                    )}
                </div>
            }
            title="预约详情"
            trigger="click"
            open={visible}
            onOpenChange={(v) => {
                setVisible(v);
                if (!v) setEditing(false);
            }}
        >
            <Button size="small" type="link">详情</Button>
        </Popover>
    );
};

export const FoodListSection = ({ foods, onSave }: FoodListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (record: Food) => record.id === editingKey;

    const edit = (record: Food) => {
        form.setFieldsValue({
            ...record,
            reservation_required: record.reservation_required ?? false
        });
        setEditingKey(record.id);
        if (newRowId === record.id) {
            // keep newRowId
        } else {
            setNewRowId(null);
        }
    };

    const handleDelete = (key: string) => {
        const newData = foods.filter((item) => item.id !== key);
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
            const row = (await form.validateFields()) as Food;
            const newData = [...foods];
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

    const handleUpdateReservationInfo = (id: string, info: string) => {
        const newData = [...foods];
        const index = newData.findIndex((item) => id === item.id);
        if (index > -1) {
            newData[index] = { ...newData[index], reservation_info: info };
            onSave(newData);
        }
    };

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newFood: Food = {
            id: newKey,
            name: '',
            time: '',
            type: '',
            rating: 0,
            comment: '',
            reservation_required: false,
            reservation_info: '',
            website: '',
        };
        // Add to list immediately
        onSave([...foods, newFood]);
        // Set as editing
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newFood);
    };

    const columns = [
        { title: '名称', dataIndex: 'name', key: 'name', width: '15%', editable: true },
        {
            title: '星级',
            dataIndex: 'rating',
            key: 'rating',
            width: '200px',
            editable: true,
            render: (rating: number) => <Rate disabled defaultValue={rating} style={{ minWidth: 150 }} />
        },
        { title: '菜系/类型', dataIndex: 'type', key: 'type', width: '10%', editable: true },
        { title: '营业时间', dataIndex: 'time', key: 'time', width: '10%', editable: true },
        { title: '评价/推荐菜', dataIndex: 'comment', key: 'comment', width: '25%', editable: true },
        {
            title: '官网',
            dataIndex: 'website',
            key: 'website',
            width: '10%',
            editable: true,
            render: (text: string) => text ? <a href={text} target="_blank" rel="noopener noreferrer">链接</a> : '-'
        },
        {
            title: '需预约',
            dataIndex: 'reservation_required',
            key: 'reservation_required',
            width: '10%',
            editable: true,
            render: (val: boolean, record: Food) => (
                <Space>
                    {val ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag>}
                    {val && (
                        <ReservationDetails
                            record={record}
                            onSave={(info) => handleUpdateReservationInfo(record.id, info)}
                        />
                    )}
                </Space>
            )
        },
        {
            title: '操作',
            dataIndex: 'operation',
            width: '10%',
            render: (_: any, record: Food) => {
                const editable = isEditing(record);
                return editable ? (
                    <Space>
                        <TypographyLink onClick={() => save(record.id)} style={{ marginRight: 8 }}>
                            <SaveOutlined />
                        </TypographyLink>
                        <Popconfirm title="确定取消吗?" onConfirm={cancel}>
                            <a style={{ color: 'gray' }}><CloseOutlined /></a>
                        </Popconfirm>
                    </Space>
                ) : (
                    <Space>
                        <TypographyLink disabled={editingKey !== ''} onClick={() => edit(record)}>
                            <EditOutlined />
                        </TypographyLink>
                        <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.id)}>
                            <a style={{ color: 'red' }}><DeleteOutlined /></a>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const mergedColumns = columns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: Food) => ({
                record,
                inputType: col.dataIndex === 'reservation_required' ? 'boolean' : (col.dataIndex === 'rating' ? 'rate' : 'text'),
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });

    return (
        <Card title="美食列表" bordered={false}>
            <Form form={form} component={false}>
                <Table
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    bordered
                    dataSource={foods}
                    columns={mergedColumns}
                    rowClassName="editable-row"
                    pagination={false}
                    rowKey="id"
                    footer={() => (
                        <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                            添加美食
                        </Button>
                    )}
                />
            </Form>
        </Card>
    );
};

// Simple Typography Link helper
const TypographyLink = ({ children, ...props }: any) => (
    <a {...props} style={{ cursor: 'pointer', ...props.style }}>{children}</a>
);

