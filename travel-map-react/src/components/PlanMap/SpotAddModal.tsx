import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';

interface SpotAddModalProps {
    open: boolean;
    onOk: (name: string) => void;
    onCancel: () => void;
}

export const SpotAddModal: React.FC<SpotAddModalProps> = ({ open, onOk, onCancel }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (open) {
            setName('');
        }
    }, [open]);

    const handleOk = () => {
        if (name.trim()) {
            onOk(name.trim());
        }
    };

    return (
        <Modal
            title="添加景点"
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            okText="添加"
            cancelText="取消"
            destroyOnHidden
        >
            <Input
                placeholder="景点名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onPressEnter={handleOk}
                autoFocus
            />
        </Modal>
    );
};

