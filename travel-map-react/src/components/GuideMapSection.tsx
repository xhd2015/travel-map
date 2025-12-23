import { useState } from 'react';
import { Card, Button, Row, Col, Empty, message, Upload, Spin, Tooltip, Image } from 'antd';
import { PlusOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { GuideImage } from '../api';
import { api } from '../api';
import { useParams } from 'react-router-dom';
import { GUIDE_MAP_HELP } from './help';
import { ImageUploadModal } from './ImageUploadModal';

interface GuideMapSectionProps {
    images: GuideImage[];
    onSave: (g: GuideImage[]) => void;
}

export const GuideMapSection = ({ images, onSave }: GuideMapSectionProps) => {
    const { planId, destId } = useParams<{ planId: string; destId: string }>();
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleUpload = async (file: File) => {
        if (!planId || !destId) return;
        setUploading(true);
        try {
            const url = await api.uploadGuideImage(planId, destId, file);
            const newImage = { id: Date.now().toString(), url: url };
            onSave([...images, newImage]);
            message.success('图片上传成功');
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            message.error('图片上传失败');
        } finally {
            setUploading(false);
        }
    };

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>导览图</span>
            <Tooltip title={GUIDE_MAP_HELP}>
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    return (
        <Card title={title} variant="borderless">
            {images.length === 0 ? (
                <Empty description="暂无导览图">
                    <Button icon={<UploadOutlined />} onClick={() => setIsModalOpen(true)}>上传图片</Button>
                </Empty>
            ) : (
                <Row gutter={[16, 16]}>
                    {images.map((img) => (
                        <Col span={24} key={img.id}>
                            <Image
                                src={img.url}
                                width="100%"
                                style={{
                                    maxHeight: '500px',
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    border: '1px solid #f0f0f0'
                                }}
                            />
                        </Col>
                    ))}
                    <Col span={24}>
                        <Button
                            type="dashed"
                            style={{ width: '100%', height: '100px' }}
                            onClick={() => setIsModalOpen(true)}
                        >
                            <PlusOutlined style={{ fontSize: '24px' }} />
                        </Button>
                    </Col>
                </Row>
            )}

            <ImageUploadModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleUpload}
                loading={uploading}
            />
        </Card>
    );
};
