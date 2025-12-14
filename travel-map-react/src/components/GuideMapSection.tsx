import { useState } from 'react';
import { Card, Button, Modal, Input, Row, Col, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { GuideImage } from '../api';

interface GuideMapSectionProps {
    images: GuideImage[];
    onSave: (g: GuideImage[]) => void;
}

export const GuideMapSection = ({ images, onSave }: GuideMapSectionProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newUrl, setNewUrl] = useState('');

    const handleAdd = () => {
        if (!newUrl) return;
        const newImage = { id: Date.now().toString(), url: newUrl };
        onSave([...images, newImage]);
        setNewUrl('');
        setIsEditing(false);
    };

    return (
        <Card title="导览图" bordered={false}>
            {images.length === 0 ? (
                <Empty description="暂无导览图">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsEditing(true)}>
                        添加图片
                    </Button>
                </Empty>
            ) : (
                <Row gutter={[16, 16]}>
                    {images.map((img) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={img.id}>
                            <div
                                style={{
                                    height: '150px',
                                    backgroundImage: `url(${img.url})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    borderRadius: '8px',
                                    border: '1px solid #f0f0f0'
                                }}
                            />
                        </Col>
                    ))}
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Button
                            type="dashed"
                            style={{ width: '100%', height: '150px' }}
                            onClick={() => setIsEditing(true)}
                        >
                            <PlusOutlined style={{ fontSize: '24px' }} />
                        </Button>
                    </Col>
                </Row>
            )}

            <Modal
                title="添加导览图"
                open={isEditing}
                onOk={handleAdd}
                onCancel={() => setIsEditing(false)}
                okText="添加"
                cancelText="取消"
            >
                <Input
                    placeholder="图片 URL"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                />
            </Modal>
        </Card>
    );
};
