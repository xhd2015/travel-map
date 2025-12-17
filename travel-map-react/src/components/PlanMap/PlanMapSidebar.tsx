import React from 'react';
import { Layout, Input, List, Button, Typography } from 'antd';
import { ArrowLeftOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { Spot } from '../../api';

const { Sider } = Layout;
const { Title } = Typography;

interface PlanMapSidebarProps {
    onBack: () => void;
    searchText: string;
    onSearch: (value: string) => void;
    searchLoading: boolean;
    searchResults: any[];
    onSelectResult: (item: any) => void;
    spots: Spot[];
    onSelectSpot: (spot: Spot) => void;
}

export const PlanMapSidebar: React.FC<PlanMapSidebarProps> = ({
    onBack,
    searchText,
    onSearch,
    searchLoading,
    searchResults,
    onSelectResult,
    spots,
    onSelectSpot
}) => {
    return (
        <Sider width={400} theme="light" style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 16 }}>返回详情</Button>
                <Title level={4}>地图编辑</Title>
                <Input.Search
                    placeholder="搜索地点..."
                    value={searchText}
                    onChange={e => onSearch(e.target.value)}
                    loading={searchLoading}
                    allowClear
                />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
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
                {searchResults.length === 0 && searchText && !searchLoading && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>未找到结果</div>
                )}
                {searchResults.length === 0 && !searchText && (
                    <div style={{ padding: '16px' }}>
                        <Title level={5}>已标记景点</Title>
                        <List
                            dataSource={spots}
                            renderItem={spot => (
                                <List.Item
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onSelectSpot(spot)}
                                >
                                    <List.Item.Meta
                                        title={spot.name}
                                        description={spot.lat && spot.lng ? '已定位' : '无坐标'}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </div>
        </Sider>
    );
};

