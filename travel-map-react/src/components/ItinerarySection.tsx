import { useRef, useEffect } from 'react';
import { Card, Button, Table, Space, Popconfirm, Tooltip, Typography, Empty, Input } from 'antd';
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

interface ItineraryDayGroup {
    day: string;
    date: string;
    items: ItineraryItem[];
}

const DEFAULT_DAY_LABEL = '第1天';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDayLabel = (day?: string, fallback = DEFAULT_DAY_LABEL) => day?.trim() || fallback;

const isValidDate = (value?: string) => {
    if (!value || !DATE_PATTERN.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

const addDays = (dateStr: string, offset: number) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + offset);
    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getUTCDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
};

const buildDayGroups = (itineraries: ItineraryItem[]): ItineraryDayGroup[] => {
    const groups = new Map<string, ItineraryDayGroup>();

    itineraries.forEach((item) => {
        const day = normalizeDayLabel(item.day);
        if (!groups.has(day)) {
            groups.set(day, { day, date: item.date?.trim() || '', items: [] });
        }
        const group = groups.get(day);
        if (group && !group.date && item.date?.trim()) {
            group.date = item.date.trim();
        }
        group?.items.push({ ...item, day, date: item.date?.trim() || '' });
    });

    return Array.from(groups.values());
};

const flattenDayGroups = (groups: ItineraryDayGroup[]) => (
    groups.flatMap((group) => group.items.map((item) => ({ ...item, day: group.day, date: group.date })))
);

const createItineraryItem = (day: string, date = ''): ItineraryItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    day,
    date,
    time: '',
    activity: '',
    description: '',
    reference: ''
});

const createHourlySchedule = (day: string, date = ''): ItineraryItem[] => {
    const items: ItineraryItem[] = [];
    const seed = Date.now();

    for (let i = 8; i < 19; i++) {
        const start = i.toString().padStart(2, '0') + ':00';
        const end = (i + 1).toString().padStart(2, '0') + ':00';
        items.push({
            id: `${seed}-${i}`,
            day,
            date,
            time: `${start}-${end}`,
            activity: '',
            description: '',
            reference: ''
        });
    }

    return items;
};

export const ItinerarySection = ({ itineraries, onSave, destinationName, spots }: ItinerarySectionProps) => {
    // Ref to hold latest itineraries for safe concurrent updates
    const itinerariesRef = useRef(itineraries);
    useEffect(() => {
        itinerariesRef.current = itineraries;
    }, [itineraries]);

    const saveGroups = (groups: ItineraryDayGroup[]) => {
        onSave(flattenDayGroups(groups));
    };

    const updateGroups = (updater: (groups: ItineraryDayGroup[]) => ItineraryDayGroup[]) => {
        const groups = buildDayGroups(itinerariesRef.current);
        saveGroups(updater(groups));
    };

    const handleUpdate = (id: string, field: keyof ItineraryItem, value: string) => {
        const newData = itinerariesRef.current.map((item) => {
            if (item.id === id) {
                return { ...item, day: normalizeDayLabel(item.day), date: item.date?.trim() || '', [field]: value };
            }
            return { ...item, day: normalizeDayLabel(item.day), date: item.date?.trim() || '' };
        });
        onSave(newData);
    };

    const handleDelete = (key: string) => {
        updateGroups((groups) => (
            groups
                .map((group) => ({
                    ...group,
                    items: group.items.filter((item) => item.id !== key)
                }))
                .filter((group) => group.items.length > 0)
        ));
    };

    const getNextDayLabel = () => {
        const existingDays = new Set(buildDayGroups(itinerariesRef.current).map((group) => group.day));
        let index = existingDays.size + 1;
        let nextLabel = `第${index}天`;

        while (existingDays.has(nextLabel)) {
            index += 1;
            nextLabel = `第${index}天`;
        }

        return nextLabel;
    };

    const handleAddDay = () => {
        const day = getNextDayLabel();
        updateGroups((groups) => {
            const previousDate = groups.length > 0 ? groups[groups.length - 1].date : '';
            const nextDate = isValidDate(previousDate) ? addDays(previousDate, 1) : '';
            return [...groups, { day, date: nextDate, items: [createItineraryItem(day, nextDate)] }];
        });
    };

    const handleRenameDay = (oldDay: string, nextDay: string) => {
        const normalizedNextDay = nextDay.trim();
        if (!normalizedNextDay || normalizedNextDay === oldDay) {
            return;
        }

        updateGroups((groups) => groups.map((group) => (
            group.day === oldDay
                ? {
                    ...group,
                    day: normalizedNextDay,
                    items: group.items.map((item) => ({ ...item, day: normalizedNextDay, date: group.date }))
                }
                : group
        )));
    };

    const handleUpdateDayDate = (day: string, nextDate: string) => {
        updateGroups((groups) => groups.map((group) => (
            group.day === day
                ? {
                    ...group,
                    date: nextDate.trim(),
                    items: group.items.map((item) => ({ ...item, date: nextDate.trim() }))
                }
                : group
        )));
    };

    const handleDeleteDay = (day: string) => {
        updateGroups((groups) => groups.filter((group) => group.day !== day));
    };

    const moveDay = (day: string, direction: 'up' | 'down') => {
        updateGroups((groups) => {
            const index = groups.findIndex((group) => group.day === day);
            if (index < 0) {
                return groups;
            }

            if (direction === 'up' && index === 0) {
                return groups;
            }
            if (direction === 'down' && index === groups.length - 1) {
                return groups;
            }

            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            const nextGroups = [...groups];
            const current = nextGroups[index];
            nextGroups[index] = nextGroups[targetIndex];
            nextGroups[targetIndex] = current;
            return nextGroups;
        });
    };

    const handleAddRow = (day: string) => {
        updateGroups((groups) => groups.map((group) => (
            group.day === day
                ? { ...group, items: [...group.items, createItineraryItem(day, group.date)] }
                : group
        )));
    };

    const moveRow = (day: string, index: number, direction: 'up' | 'down') => {
        updateGroups((groups) => groups.map((group) => {
            if (group.day !== day) {
                return group;
            }

            if (direction === 'up' && index === 0) return group;
            if (direction === 'down' && index === group.items.length - 1) return group;

            const items = [...group.items];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            const current = items[index];
            items[index] = items[targetIndex];
            items[targetIndex] = current;
            return { ...group, items };
        }));
    };

    const handleGenerateSchedule = (day: string) => {
        updateGroups((groups) => groups.map((group) => (
            group.day === day
                ? { ...group, items: [...group.items, ...createHourlySchedule(day, group.date)] }
                : group
        )));
    };

    const getColumns = (day: string, itemCount: number) => [
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
                        onClick={() => moveRow(day, index, 'up')}
                    >
                        <ArrowUpOutlined />
                    </Typography.Link>
                    <Typography.Link
                        disabled={index === itemCount - 1}
                        onClick={() => moveRow(day, index, 'down')}
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

    const dayGroups = buildDayGroups(itineraries);
    const suggestedNextDate = dayGroups.length > 0 && isValidDate(dayGroups[dayGroups.length - 1].date)
        ? addDays(dayGroups[dayGroups.length - 1].date, 1)
        : '';
    const tooltipTitle = getItineraryHelp(destinationName, spots);

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>行程表</span>
            <Tooltip title={tooltipTitle} styles={{ root: { maxWidth: '600px' } }}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    const extra = (
        <Space size="small">
            {suggestedNextDate && (
                <Button size="small" type="dashed" onClick={handleAddDay} icon={<PlusOutlined />}>
                    {`添加${suggestedNextDate}`}
                </Button>
            )}
            <Button size="small" type="dashed" onClick={handleAddDay} icon={<PlusOutlined />}>
                添加天数
            </Button>
        </Space>
    );

    return (
        <Card title={title} extra={extra} variant="borderless">
            {dayGroups.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="还没有每日行程，先添加一天"
                />
            ) : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {dayGroups.map((group, groupIndex) => {
                        return (
                        <Card
                            key={group.day}
                            size="small"
                            title={(
                                <Space wrap>
                                    <SeamlessDebouncedInput
                                        value={group.day}
                                        onChange={(value) => handleRenameDay(group.day, value)}
                                        placeholder="例如：第1天 / 2026-05-01"
                                        style={{ minWidth: 180 }}
                                    />
                                    <Typography.Text type="secondary">
                                        {group.items.length} 条行程
                                    </Typography.Text>
                                </Space>
                            )}
                            extra={(
                                <Space size="small">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Typography.Text type="secondary">日期</Typography.Text>
                                        <Input
                                            value={group.date}
                                            onChange={(e) => handleUpdateDayDate(group.day, e.target.value)}
                                            placeholder={groupIndex > 0 && isValidDate(dayGroups[groupIndex - 1].date) ? addDays(dayGroups[groupIndex - 1].date, 1) : '2026-04-22'}
                                            style={{ width: 150 }}
                                            status={group.date && !isValidDate(group.date) ? 'error' : undefined}
                                        />
                                    </div>
                                    <Button
                                        size="small"
                                        onClick={() => moveDay(group.day, 'up')}
                                        disabled={groupIndex === 0}
                                        icon={<ArrowUpOutlined />}
                                    />
                                    <Button
                                        size="small"
                                        onClick={() => moveDay(group.day, 'down')}
                                        disabled={groupIndex === dayGroups.length - 1}
                                        icon={<ArrowDownOutlined />}
                                    />
                                    <Button size="small" onClick={() => handleGenerateSchedule(group.day)}>
                                        生成时间表
                                    </Button>
                                    <Popconfirm
                                        title="确定删除这一天的全部行程吗?"
                                        onConfirm={() => handleDeleteDay(group.day)}
                                    >
                                        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                                    </Popconfirm>
                                </Space>
                            )}
                        >
                            {group.date && !isValidDate(group.date) && (
                                <div style={{ marginBottom: 12 }}>
                                    <Typography.Text type="danger">
                                        请输入有效日期，例如 2026-04-22，或者留空
                                    </Typography.Text>
                                </div>
                            )}
                            <Table
                                bordered
                                size="small"
                                dataSource={group.items}
                                columns={getColumns(group.day, group.items.length)}
                                pagination={false}
                                rowKey="id"
                                footer={() => (
                                    <Button type="dashed" onClick={() => handleAddRow(group.day)} block icon={<PlusOutlined />}>
                                        添加当天行程
                                    </Button>
                                )}
                            />
                        </Card>
                        );
                    })}
                </Space>
            )}
        </Card>
    );
};
