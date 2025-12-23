import { useState, useRef, useEffect } from 'react';
import { Card, Table, Button, Input, Popconfirm, Space, Select, Tag, Popover, Tooltip, Rate, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { Spot } from '../api';
import { getSpotListHelp } from './help';
import { SeamlessDebouncedInput } from './common/SeamlessDebouncedInput';

interface SpotListSectionProps {
    spots: Spot[];
    onSave: (s: Spot[]) => void;
    destinationName?: string;
}

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

export const SpotListSection = ({ spots, onSave, destinationName }: SpotListSectionProps) => {
    // Ref to hold latest spots for safe concurrent updates
    const spotsRef = useRef(spots);
    useEffect(() => {
        spotsRef.current = spots;
    }, [spots]);

    const handleUpdate = (id: string, field: keyof Spot, value: any) => {
        const newData = spotsRef.current.map((item) => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        onSave(newData);
    };

    const handleDelete = (key: string) => {
        const newData = spotsRef.current.filter((item) => item.id !== key);
        onSave(newData);
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
            play_time: '',
            reservation_required: false,
            reservation_info: '',
        };
        onSave([...spotsRef.current, newSpot]);
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            width: '15%',
            render: (text: string, record: Spot) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'name', val)}
                />
            )
        },
        {
            title: '星级',
            dataIndex: 'rating',
            key: 'rating',
            width: '200px',
            render: (rating: number, record: Spot) => (
                <Rate
                    allowHalf
                    value={rating}
                    onChange={(val) => handleUpdate(record.id, 'rating', val)}
                    style={{ minWidth: 150 }}
                />
            )
        },
        {
            title: '开放时间',
            dataIndex: 'time',
            key: 'time',
            width: '10%',
            render: (text: string, record: Spot) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'time', val)}
                />
            )
        },
        {
            title: '介绍',
            dataIndex: 'interior',
            key: 'interior',
            width: '25%',
            render: (text: string, record: Spot) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'interior', val)}
                    textarea
                    autoSize={{ minRows: 1, maxRows: 6 }}
                />
            )
        },
        {
            title: '游玩时长',
            dataIndex: 'play_time',
            key: 'play_time',
            width: '10%',
            render: (text: string, record: Spot) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'play_time', val)}
                />
            )
        },
        {
            title: '官网',
            dataIndex: 'website',
            key: 'website',
            width: '10%',
            render: (text: string, record: Spot) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'website', val)}
                    placeholder="https://"
                />
            )
        },
        {
            title: '需预约',
            dataIndex: 'reservation_required',
            key: 'reservation_required',
            width: '12%',
            render: (val: boolean, record: Spot) => (
                <Space>
                    <Select
                        value={val}
                        onChange={(newVal) => handleUpdate(record.id, 'reservation_required', newVal)}
                        variant="borderless"
                        style={{ width: 60 }}
                    >
                        <Select.Option value={true}><Tag color="red">是</Tag></Select.Option>
                        <Select.Option value={false}><Tag color="green">否</Tag></Select.Option>
                    </Select>
                    {val && (
                        <ReservationDetails
                            record={record}
                            onSave={(info) => handleUpdate(record.id, 'reservation_info', info)}
                        />
                    )}
                </Space>
            )
        },
        {
            title: '操作',
            dataIndex: 'operation',
            width: '12%',
            render: (_: any, record: Spot) => (
                <Space>
                    <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.id)}>
                        <Typography.Link type="danger">
                            <DeleteOutlined />
                        </Typography.Link>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tooltipText = getSpotListHelp(destinationName);

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>景点列表</span>
            <Tooltip title={tooltipText}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    return (
        <Card title={title} variant="borderless">
            <Table
                bordered
                dataSource={spots.filter(s => !s.hide_in_list)}
                columns={columns}
                pagination={false}
                rowKey="id"
                footer={() => (
                    <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                        添加景点
                    </Button>
                )}
            />
        </Card>
    );
};
