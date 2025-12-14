import React from 'react';
import { Card, Button } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import type { Config } from '../../api';

interface DestinationOverlayProps {
    config: Config;
    onLocate: () => void;
}

export const DestinationOverlay: React.FC<DestinationOverlayProps> = ({ config, onLocate }) => {
    if (!config.destination) return null;

    return (
        <Card
            size="small"
            style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlagOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 'bold' }}>目的地: {config.destination.name}</span>
                <Button
                    type="link"
                    size="small"
                    onClick={onLocate}
                >
                    定位
                </Button>
            </div>
        </Card>
    );
};

