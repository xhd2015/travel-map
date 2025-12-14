import { useState } from 'react';
import { Card, Button, Row, Col, Empty, message, Upload, Spin, Tooltip, Image } from 'antd';
import { PlusOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { GuideImage } from '../api';
import { api } from '../api';
import { useParams } from 'react-router-dom';

interface GuideMapSectionProps {
    images: GuideImage[];
    onSave: (g: GuideImage[]) => void;
}

export const GuideMapSection = ({ images, onSave }: GuideMapSectionProps) => {
    const { planId } = useParams<{ planId: string }>();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        if (!planId) return false;
        setUploading(true);
        try {
            const url = await api.uploadGuideImage(planId, file);
            const newImage = { id: Date.now().toString(), url: url };
            onSave([...images, newImage]);
            message.success('图片上传成功');
        } catch (error) {
            console.error(error);
            message.error('图片上传失败');
        } finally {
            setUploading(false);
        }
        return false; // Prevent auto upload by antd
    };

    const UploadButton = (
        <Upload
            showUploadList={false}
            beforeUpload={handleUpload}
            accept="image/*"
        >
            <Button icon={uploading ? <Spin /> : <UploadOutlined />}>上传图片</Button>
        </Upload>
    );

    const title = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>导览图</span>
            <Tooltip title="使用小红书搜索">
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
            </Tooltip>
        </div>
    );

    return (
        <Card title={title} bordered={false}>
            {images.length === 0 ? (
                <Empty description="暂无导览图">
                    {UploadButton}
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
                        <Upload
                            showUploadList={false}
                            beforeUpload={handleUpload}
                            accept="image/*"
                        >
                            <Button
                                type="dashed"
                                style={{ width: '100%', height: '100px' }}
                                disabled={uploading}
                            >
                                {uploading ? <Spin /> : <PlusOutlined style={{ fontSize: '24px' }} />}
                            </Button>
                        </Upload>
                    </Col>
                </Row>
            )}
        </Card>
    );
};
