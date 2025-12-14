import { useState } from 'react';
import { Card, Table, Button, Form, Input, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Route as RouteType } from '../api';

interface RouteListSectionProps {
    routes: RouteType[];
    onSave: (r: RouteType[]) => void;
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: string;
    inputType: 'text';
    record: RouteType;
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
    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={[{ required: dataIndex === 'name', message: `请输入${title}!` }]}
                >
                    {dataIndex === 'story' ? <Input.TextArea autoSize /> : <Input />}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

export const RouteListSection = ({ routes, onSave }: RouteListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (record: RouteType) => record.id === editingKey;

    const edit = (record: RouteType) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.id);
        if (newRowId === record.id) {
            // keep
        } else {
            setNewRowId(null);
        }
    };

    const handleDelete = (key: string) => {
        const newData = routes.filter((item) => item.id !== key);
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
            const row = (await form.validateFields()) as RouteType;
            const newData = [...routes];
            const index = newData.findIndex((item) => key === item.id);

            if (index > -1) {
                const item = newData[index];
                // preserve spots if any (though currently empty)
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
        const newRoute: RouteType = {
            id: newKey,
            name: '',
            time: '',
            spots: [],
            duration: '',
            story: '',
        };
        onSave([...routes, newRoute]);
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newRoute);
    };

    const columns = [
        { title: '名称', dataIndex: 'name', key: 'name', width: '20%', editable: true },
        { title: '时间', dataIndex: 'time', key: 'time', width: '15%', editable: true },
        { title: '耗时', dataIndex: 'duration', key: 'duration', width: '15%', editable: true },
        { title: '典故', dataIndex: 'story', key: 'story', width: '30%', editable: true },
        {
            title: '操作',
            dataIndex: 'operation',
            width: '20%',
            render: (_: any, record: RouteType) => {
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
            onCell: (record: RouteType) => ({
                record,
                inputType: 'text',
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });

    return (
        <Card title="线路列表" bordered={false}>
            <Form form={form} component={false}>
                <Table
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    bordered
                    dataSource={routes}
                    columns={mergedColumns}
                    rowClassName="editable-row"
                    pagination={false}
                    rowKey="id"
                    footer={() => (
                        <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                            添加线路
                        </Button>
                    )}
                />
            </Form>
        </Card>
    );
};

const TypographyLink = ({ children, ...props }: any) => (
    <a {...props} style={{ cursor: 'pointer', ...props.style }}>{children}</a>
);
