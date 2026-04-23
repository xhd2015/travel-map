import React, { useState } from 'react';
import { Layout, Input, List, Button, Typography, Spin, Checkbox } from 'antd';
import { ArrowLeftOutlined, EnvironmentOutlined, LoadingOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { Spot } from '../../api';
import { ResizableSidebarLayout } from '../../layout/ResizableSidebarLayout';
import { SeamlessDebouncedInput } from '../common/SeamlessDebouncedInput';

const { Sider } = Layout;
const { Title } = Typography;

interface PlanMapSidebarProps {
    onBack: () => void;
    searchText: string;
    onSearch: (value: string, immediate?: boolean) => void;
    searchLoading: boolean;
    searchResults: any[];
    onSelectResult: (item: any) => void;
    spots: Spot[];
    onSelectSpot: (spot: Spot) => void;
    onUpdateSpot: (spot: Spot) => void;
    onReorderSpots: (fromIndex: number, toIndex: number) => void;
    onPickLocation: (spot: Spot) => void;
    pickingLocationSpot: Spot | null;
    onCancelPickLocation: () => void;
}

export const PlanMapSidebar: React.FC<PlanMapSidebarProps> = ({
    onBack,
    searchText,
    onSearch,
    searchLoading,
    searchResults,
    onSelectResult,
    spots,
    onSelectSpot,
    onUpdateSpot,
    onReorderSpots,
    onPickLocation,
    pickingLocationSpot,
    onCancelPickLocation
}) => {
    const [width, setWidth] = useState(400);
    const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
    const [editingSpotName, setEditingSpotName] = useState('');

    const beginEditSpot = (spot: Spot) => {
        setEditingSpotId(spot.id);
        setEditingSpotName(spot.name || '');
    };

    const cancelEditSpot = () => {
        setEditingSpotId(null);
        setEditingSpotName('');
    };

    const saveEditSpot = (spot: Spot) => {
        onUpdateSpot({ ...spot, name: editingSpotName.trim() || spot.name });
        cancelEditSpot();
    };

    return (
        <Sider
            width={width}
            theme="light"
            style={{ borderRight: '1px solid #f0f0f0', height: '100vh', padding: 0 }}
        >
            <ResizableSidebarLayout
                width={width}
                onResize={setWidth}
                minWidth={200}
                maxWidth={800}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                        <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 16 }}>返回详情</Button>
                        <Title level={4}>地图编辑</Title>
                        <Input.Search
                            placeholder="搜索地点..."
                            value={searchText}
                            onChange={e => onSearch(e.target.value)}
                            onSearch={value => onSearch(value, true)}
                            loading={searchLoading}
                            allowClear
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                        {searchLoading && (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="正在搜索..." />
                            </div>
                        )}
                        {!searchLoading && (
                            <>
                                <List
                                    dataSource={searchResults}
                                    renderItem={item => (
                                        <List.Item
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => onSelectResult(item)}
                                            actions={[<Button type="link" size="small" onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectResult(item);
                                            }}>定位</Button>]}
                                        >
                                            <List.Item.Meta
                                                avatar={<EnvironmentOutlined />}
                                                title={item.display_name}
                                            />
                                        </List.Item>
                                    )}
                                />
                                {searchResults.length === 0 && searchText && (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>未找到结果</div>
                                )}
                                {searchResults.length === 0 && !searchText && (
                                    <div style={{ padding: '16px' }}>
                                        <Title level={5}>已标记景点</Title>
                                        <List
                                            dataSource={spots}
                                            renderItem={(spot, index) => (
                                                <List.Item
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        if (editingSpotId !== spot.id) {
                                                            onSelectSpot(spot);
                                                        }
                                                    }}
                                                    actions={[
                                                        <Button
                                                            key="up"
                                                            type="text"
                                                            size="small"
                                                            icon={<ArrowUpOutlined />}
                                                            disabled={index === 0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onReorderSpots(index, index - 1);
                                                            }}
                                                        />,
                                                        <Button
                                                            key="down"
                                                            type="text"
                                                            size="small"
                                                            icon={<ArrowDownOutlined />}
                                                            disabled={index === spots.length - 1}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onReorderSpots(index, index + 1);
                                                            }}
                                                        />,
                                                        editingSpotId === spot.id ? (
                                                            <Button
                                                                key="save"
                                                                type="text"
                                                                size="small"
                                                                icon={<SaveOutlined />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    saveEditSpot(spot);
                                                                }}
                                                            />
                                                        ) : (
                                                            <Button
                                                                key="edit"
                                                                type="text"
                                                                size="small"
                                                                icon={<EditOutlined />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    beginEditSpot(spot);
                                                                }}
                                                            />
                                                        ),
                                                        editingSpotId === spot.id && (
                                                            <Button
                                                                key="cancel"
                                                                type="text"
                                                                size="small"
                                                                icon={<CloseOutlined />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    cancelEditSpot();
                                                                }}
                                                            />
                                                        )
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        avatar={(
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
                                                                {(() => {
                                                                    if (spot.icon === 'flag') {
                                                                        return <div style={{ fontSize: '24px', lineHeight: 1 }}>🚩</div>;
                                                                    }
                                                                    if (spot.icon && spot.icon.startsWith('number-')) {
                                                                        const num = parseInt(spot.icon.split('-')[1], 10);
                                                                        if (!isNaN(num)) {
                                                                            return (
                                                                                <div style={{
                                                                                    backgroundColor: '#1890ff',
                                                                                    width: '24px',
                                                                                    height: '24px',
                                                                                    borderRadius: '50%',
                                                                                    color: 'white',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '12px',
                                                                                    border: '2px solid white',
                                                                                    boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                                                                                }}>
                                                                                    {num}
                                                                                </div>
                                                                            );
                                                                        }
                                                                    }
                                                                    return <EnvironmentOutlined style={{ fontSize: '20px', color: '#1890ff' }} />;
                                                                })()}
                                                            </div>
                                                        )}
                                                        title={editingSpotId === spot.id ? (
                                                            <div onClick={(e) => e.stopPropagation()}>
                                                                <SeamlessDebouncedInput
                                                                    value={editingSpotName}
                                                                    onChange={setEditingSpotName}
                                                                    plainWhenBlurred={false}
                                                                    placeholder="输入标记名称"
                                                                    style={{ fontWeight: 500, paddingLeft: 0 }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontWeight: 500 }}>{spot.name}</span>
                                                        )}
                                                        description={
                                                            <div>
                                                                <div
                                                                    style={{ marginBottom: 4 }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                >
                                                                    <Checkbox
                                                                        checked={!spot.hide_in_list}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            onUpdateSpot({ ...spot, hide_in_list: !e.target.checked });
                                                                        }}
                                                                    >
                                                                        景点
                                                                    </Checkbox>
                                                                </div>
                                                                {pickingLocationSpot?.id === spot.id ? (
                                                                    <Button
                                                                        size="small"
                                                                        type="link"
                                                                        danger
                                                                        style={{ padding: 0, height: 'auto' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onCancelPickLocation();
                                                                        }}
                                                                    >
                                                                        取消选择
                                                                    </Button>
                                                                ) : (
                                                                    spot.lat !== undefined && spot.lng !== undefined ? (
                                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                            <span>已定位</span>
                                                                            <Button
                                                                                size="small"
                                                                                type="link"
                                                                                style={{ padding: 0, height: 'auto' }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    onPickLocation(spot);
                                                                                }}
                                                                            >
                                                                                更新位置
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <Button
                                                                            size="small"
                                                                            type="link"
                                                                            style={{ padding: 0, height: 'auto' }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onPickLocation(spot);
                                                                            }}
                                                                        >
                                                                            选择位置
                                                                        </Button>
                                                                    )
                                                                )}
                                                            </div>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </ResizableSidebarLayout>
        </Sider>
    );
};
