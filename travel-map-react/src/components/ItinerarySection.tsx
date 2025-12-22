import { useRef, useEffect } from 'react';
import { Card, Button, Table, Space, Popconfirm, Tooltip, Typography } from 'antd';
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, QuestionCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ItineraryItem, Spot } from '../api';
import { getItineraryHelp } from './help';
import { SeamlessDebouncedInput } from './common/SeamlessDebouncedInput';

interface ItinerarySectionProps {
    itineraries: ItineraryItem[];
    onSave: (s: ItineraryItem[]) => void;
    destinationName?: string;
    spots?: Spot[];
}

export const ItinerarySection = ({ itineraries, onSave, destinationName, spots }: ItinerarySectionProps) => {
    // Ref to hold latest itineraries for safe concurrent updates
    const itinerariesRef = useRef(itineraries);
    useEffect(() => {
        itinerariesRef.current = itineraries;
    }, [itineraries]);

    const handleUpdate = (id: string, field: keyof ItineraryItem, value: string) => {
        const newData = itinerariesRef.current.map((item) => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        onSave(newData);
    };

    const handleDelete = (key: string) => {
        const newData = itinerariesRef.current.filter((item) => item.id !== key);
        onSave(newData);
    };

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newItinerary: ItineraryItem = {
            id: newKey,
            time: '',
            activity: '',
            description: '',
            reference: ''
        };
        onSave([...itinerariesRef.current, newItinerary]);
    };

    const moveRow = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === itinerariesRef.current.length - 1) return;

        const newData = [...itinerariesRef.current];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newData[index];
        newData[index] = newData[targetIndex];
        newData[targetIndex] = temp;
        onSave(newData);
    };

    const handleGenerateSchedule = () => {
        const newItems: ItineraryItem[] = [];
        for (let i = 8; i < 19; i++) {
            const start = i.toString().padStart(2, '0') + ':00';
            const end = (i + 1).toString().padStart(2, '0') + ':00';
            newItems.push({
                id: `${Date.now()}-${i}`,
                time: `${start}-${end}`,
                activity: '',
                description: '',
                reference: ''
            });
        }
        onSave([...itinerariesRef.current, ...newItems]);
    };

    const columns = [
        {
            title: '时间',
            dataIndex: 'time',
            width: '15%',
            render: (text: string, record: ItineraryItem) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'time', val)}
                />
            )
        },
        {
            title: '活动',
            dataIndex: 'activity',
            width: '20%',
            render: (text: string, record: ItineraryItem) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'activity', val)}
                />
            )
        },
        {
            title: '详细说明',
            dataIndex: 'description',
            width: '35%',
            render: (text: string, record: ItineraryItem) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'description', val)}
                    textarea
                    autoSize={{ minRows: 1, maxRows: 6 }}
                />
            )
        },
        {
            title: '参考信息',
            dataIndex: 'reference',
            width: '15%',
            render: (text: string, record: ItineraryItem) => (
                <SeamlessDebouncedInput
                    value={text}
                    onChange={(val) => handleUpdate(record.id, 'reference', val)}
                    textarea
                    autoSize={{ minRows: 1, maxRows: 6 }}
                />
            )
        },
        {
            title: '操作',
            dataIndex: 'operation',
            render: (_: any, record: ItineraryItem, index: number) => (
                <Space>
                    <Typography.Link
                        disabled={index === 0}
                        onClick={() => moveRow(index, 'up')}
                    >
                        <ArrowUpOutlined />
                    </Typography.Link>
                    <Typography.Link
                        disabled={index === itineraries.length - 1}
                        onClick={() => moveRow(index, 'down')}
                    >
                        <ArrowDownOutlined />
                    </Typography.Link>
                    <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.id)}>
                        <Typography.Link type="danger">
                            <DeleteOutlined />
                        </Typography.Link>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tooltipTitle = getItineraryHelp(destinationName, spots);

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>行程表</span>
            <Tooltip title={tooltipTitle} overlayStyle={{ maxWidth: '600px' }}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
            <Button size="small" onClick={handleGenerateSchedule} style={{ marginLeft: 12 }}>
                生成时间表
            </Button>
        </div>
    );

    return (
        <Card title={title} bordered={false}>
            <Table
                bordered
                dataSource={itineraries}
                columns={columns}
                pagination={false}
                rowKey="id"
                footer={() => (
                    <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                        添加行程
                    </Button>
                )}
            />
        </Card>
    );
};
