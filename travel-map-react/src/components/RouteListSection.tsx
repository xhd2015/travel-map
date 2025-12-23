import { useState, useMemo, useEffect, useRef } from 'react';
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
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const hasInitializedRef = useRef(false);

    const isEditing = (record: RouteType) => record.id === editingKey;

    useEffect(() => {
        if (routes.length > 0 && !hasInitializedRef.current) {
            setExpandedRowKeys(routes.map(r => r.id));
            hasInitializedRef.current = true;
        }
    }, [routes]);

    const routesWithButtons = useMemo(() => {
        return routes.map(route => ({
            ...route,
            children: [
                ...(route.children || []),
                {
                    id: `add-btn-${route.id}`,
                    isAddButton: true,
                    parentId: route.id,
                    name: '',
                    time: '',
                    duration: '',
                    spots: [],
                    story: ''
                } as any
            ]
        }));
    }, [routes]);

    const edit = (record: RouteType) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.id);
        if (newRowId === record.id) {
            // keep
        } else {
            setNewRowId(null);
        }
    };

    // Recursive helpers
    const deleteNode = (data: RouteType[], key: string): RouteType[] => {
        return data.filter(item => {
            if (item.id === key) return false;
            if (item.children) {
                item.children = deleteNode(item.children, key);
            }
            return true;
        });
    };

    const updateNode = (data: RouteType[], key: string, newProps: Partial<RouteType>): RouteType[] => {
        return data.map(item => {
            if (item.id === key) {
                return { ...item, ...newProps };
            }
            if (item.children) {
                return { ...item, children: updateNode(item.children, key, newProps) };
            }
            return item;
        });
    };

    const addChildNode = (data: RouteType[], parentId: string, newChild: RouteType): RouteType[] => {
        return data.map(item => {
            if (item.id === parentId) {
                return { ...item, children: [...(item.children || []), newChild] };
            }
            if (item.children) {
                return { ...item, children: addChildNode(item.children, parentId, newChild) };
            }
            return item;
        });
    };

    const handleDelete = (key: string) => {
        const newData = deleteNode([...routes], key);
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
            const newData = updateNode([...routes], key, row);
            onSave(newData);
            setEditingKey('');
            setNewRowId(null);
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newRoute: RouteType = {
            id: newKey,
            name: '新线路',
            time: '',
            spots: [],
            duration: '',
            story: '',
            children: []
        };
        onSave([...routes, newRoute]);
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newRoute);
    };

    const handleAddChild = (parentId: string) => {
        const newKey = Date.now().toString();
        const newRoute: RouteType = {
            id: newKey,
            name: '新时间段',
            time: '',
            spots: [],
            duration: '',
            story: '',
        };
        const newData = addChildNode([...routes], parentId, newRoute);
        onSave(newData);
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newRoute);
        setExpandedRowKeys(prev => {
            if (!prev.includes(parentId)) return [...prev, parentId];
            return prev;
        });
    };

    const columns = [
        {
            title: '行程/地点',
            dataIndex: 'name',
            key: 'name',
            width: '30%',
            editable: true,
            render: (text: string, record: any) => {
                if (record.isAddButton) {
                    return (
                        <Button
                            type="dashed"
                            size="small"
                            onClick={() => handleAddChild(record.parentId)}
                            block
                            icon={<PlusOutlined />}
                        >
                            增加行程
                        </Button>
                    );
                }
                return text;
            }
        },
        { title: '时间', dataIndex: 'time', key: 'time', width: '25%', editable: true },
        { title: '耗时', dataIndex: 'duration', key: 'duration', width: '20%', editable: true },
        {
            title: '操作',
            dataIndex: 'operation',
            width: '25%',
            render: (_: any, record: any) => {
                if (record.isAddButton) return null;
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
            return {
                ...col,
                onCell: (record: any) => {
                    if (record.isAddButton) return { colSpan: 0 };
                    return {};
                }
            };
        }
        return {
            ...col,
            onCell: (record: any) => {
                if (record.isAddButton) {
                    if (col.dataIndex === 'name') return { colSpan: 4 };
                    return { colSpan: 0 };
                }
                return {
                    record,
                    inputType: 'text',
                    dataIndex: col.dataIndex,
                    title: col.title,
                    editing: isEditing(record),
                };
            },
        };
    });

    return (
        <Card title="线路列表" variant="borderless">
            <Form form={form} component={false}>
                <Table
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    bordered
                    dataSource={routesWithButtons}
                    columns={mergedColumns}
                    rowClassName="editable-row"
                    pagination={false}
                    rowKey="id"
                    expandable={{
                        expandedRowKeys: expandedRowKeys,
                        onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
                    }}
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
