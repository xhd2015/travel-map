import { useRef, useEffect } from 'react';
import { Card, Button, List, Space, Popconfirm, Tooltip, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { Schedule } from '../api';
import { SCHEDULE_LIST_HELP } from './help';
import { SeamlessDebouncedInput } from './common/SeamlessDebouncedInput';

interface ScheduleListSectionProps {
    schedules: Schedule[];
    onSave: (s: Schedule[]) => void;
}

export const ScheduleListSection = ({ schedules, onSave }: ScheduleListSectionProps) => {
    const schedulesRef = useRef(schedules);
    useEffect(() => {
        schedulesRef.current = schedules;
    }, [schedules]);

    const handleUpdate = (id: string, content: string) => {
        const newData = schedulesRef.current.map((item) => {
            if (item.id === id) {
                return { ...item, content };
            }
            return item;
        });
        onSave(newData);
    };

    const handleDelete = (key: string) => {
        const newData = schedulesRef.current.filter((item) => item.id !== key);
        onSave(newData);
    };

    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newSchedule: Schedule = {
            id: newKey,
            content: '',
        };
        onSave([...schedulesRef.current, newSchedule]);
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newData = [...schedulesRef.current];
        const temp = newData[index];
        newData[index] = newData[index - 1];
        newData[index - 1] = temp;
        onSave(newData);
    };

    const moveDown = (index: number) => {
        if (index === schedulesRef.current.length - 1) return;
        const newData = [...schedulesRef.current];
        const temp = newData[index];
        newData[index] = newData[index + 1];
        newData[index + 1] = temp;
        onSave(newData);
    };

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>计划</span>
            <Tooltip title={SCHEDULE_LIST_HELP}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    return (
        <Card title={title} bordered={false}>
            <List
                itemLayout="vertical"
                dataSource={schedules}
                renderItem={(item, index) => {
                    return (
                        <List.Item
                            key={item.id}
                            actions={[
                                <Space key="edit-delete">
                                    <Typography.Link
                                        disabled={index === 0}
                                        onClick={() => moveUp(index)}
                                    >
                                        <ArrowUpOutlined /> 上移
                                    </Typography.Link>
                                    <Typography.Link
                                        disabled={index === schedules.length - 1}
                                        onClick={() => moveDown(index)}
                                    >
                                        <ArrowDownOutlined /> 下移
                                    </Typography.Link>
                                    <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(item.id)}>
                                        <Typography.Link type="danger">
                                            <DeleteOutlined /> 删除
                                        </Typography.Link>
                                    </Popconfirm>
                                </Space>
                            ]}
                        >
                            <SeamlessDebouncedInput
                                value={item.content}
                                onChange={(val) => handleUpdate(item.id, val)}
                                textarea
                                autoSize={{ minRows: 2, maxRows: 10 }}
                                placeholder="输入计划内容..."
                            />
                        </List.Item>
                    );
                }}
                footer={
                    <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
                        添加计划
                    </Button>
                }
            />
        </Card>
    );
};
