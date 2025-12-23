import { useState } from 'react';
import { Card, Table, Button, Form, Input, Popconfirm, Space, Rate } from 'antd';
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
    if (inputType === 'rate') {
        inputNode = <Rate />;
    } else if (dataIndex === 'comment' || dataIndex === 'recommended_restaurants') {
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

export const FoodListSection = ({ foods, onSave }: FoodListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (record: Food) => record.id === editingKey;

    const edit = (record: Food) => {
        form.setFieldsValue({
            ...record,
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

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newFood: Food = {
            id: newKey,
            name: '',
            time: '',
            type: '',
            rating: 0,
            comment: '',
            recommended_restaurants: '',
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
        { title: '推荐餐厅', dataIndex: 'recommended_restaurants', key: 'recommended_restaurants', width: '25%', editable: true },
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
        <Card title="美食列表" variant="borderless">
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

