import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, Popconfirm, Space, Select, Tag, Popover, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { Spot } from '../api';

interface SpotListSectionProps {
    spots: Spot[];
    onSave: (s: Spot[]) => void;
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: string;
    inputType: 'text' | 'boolean';
    record: Spot;
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
    } else if (dataIndex === 'story' || dataIndex === 'reservation_info') {
        inputNode = <Input.TextArea autoSize />;
    }

    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={[{ required: dataIndex === 'name', message: `请输入${title}!` }]}
                    valuePropName={inputType === 'boolean' ? 'value' : 'value'}
                >
                    {inputNode}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

const ReservationDetails = ({ record, onSave }: { record: Spot, onSave: (val: string) => void }) => {
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

export const SpotListSection = ({ spots, onSave }: SpotListSectionProps) => {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');
    const [newRowId, setNewRowId] = useState<string | null>(null);

    const isEditing = (record: Spot) => record.id === editingKey;

    const edit = (record: Spot) => {
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
        const newData = spots.filter((item) => item.id !== key);
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
            const row = (await form.validateFields()) as Spot;
            const newData = [...spots];
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
        const newData = [...spots];
        const index = newData.findIndex((item) => id === item.id);
        if (index > -1) {
            newData[index] = { ...newData[index], reservation_info: info };
            onSave(newData);
        }
    };

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newSpot: Spot = {
            id: newKey,
            name: '',
            time: '',
            website: '',
            interior: '',
            story: '',
            reservation_required: false,
            reservation_info: '',
        };
        // Add to list immediately
        onSave([...spots, newSpot]);
        // Set as editing
        setEditingKey(newKey);
        setNewRowId(newKey);
        form.setFieldsValue(newSpot);
    };

    const columns = [
        { title: '名称', dataIndex: 'name', key: 'name', width: '15%', editable: true },
        { title: '开放时间', dataIndex: 'time', key: 'time', width: '10%', editable: true },
        { title: '介绍', dataIndex: 'interior', key: 'interior', width: '15%', editable: true },
        { title: '典故', dataIndex: 'story', key: 'story', width: '30%', editable: true },
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
            width: '12%',
            editable: true,
            render: (val: boolean, record: Spot) => (
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
            width: '12%',
            render: (_: any, record: Spot) => {
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
            onCell: (record: Spot) => ({
                record,
                inputType: col.dataIndex === 'reservation_required' ? 'boolean' : 'text',
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = tomorrow.getMonth() + 1;
    const dd = tomorrow.getDate();
    const dateStr = `${yyyy}年${mm}月${dd}日`;
    const tooltipText = `使用Deepseek，提示词: 我将于${dateStr}，从九江自驾到景德镇，请列出景德镇的“此生必去”景点，按重要性排序，给出一个表格，包含：景点名，开放时间范围，是否需要预约，预约方式，游玩方式（步行，观光车，缆车），游玩花费时间`;

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>景点列表</span>
            <Tooltip title={tooltipText}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    return (
        <Card title={title} bordered={false}>
            <Form form={form} component={false}>
                <Table
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    bordered
                    dataSource={spots.filter(s => !s.hide_in_list)}
                    columns={mergedColumns}
                    rowClassName="editable-row"
                    pagination={false}
                    rowKey="id"
                    footer={() => (
                        <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                            添加景点
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
