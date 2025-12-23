import React, { useState, useEffect, useRef } from 'react';
import { Modal, Upload, message, Button } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;

interface ImageUploadModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (file: File) => void;
    loading?: boolean;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ open, onCancel, onOk, loading }) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const pasteRef = useRef<HTMLDivElement>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!open) {
            setFileList([]);
            setPreviewImage(null);
        } else {
            // Focus the paste area when opened to capture paste events immediately if possible
            setTimeout(() => pasteRef.current?.focus(), 100);
        }
    }, [open]);

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let blob: File | null = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                blob = items[i].getAsFile();
                break;
            }
        }

        if (blob) {
            handleFileSelect(blob);
        }
    };

    const handleFileSelect = (file: File) => {
        // Create a fake UploadFile object for Antd Upload
        const rcFile = file as RcFile;
        rcFile.uid = Date.now().toString();

        const uploadFile: UploadFile = {
            uid: rcFile.uid,
            name: file.name || 'pasted-image.png',
            status: 'done',
            originFileObj: rcFile,
            type: file.type,
        };

        setFileList([uploadFile]);

        // Generate preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        fileList: fileList,
        beforeUpload: (file) => {
            handleFileSelect(file);
            return false; // Prevent auto upload
        },
        onRemove: () => {
            setFileList([]);
            setPreviewImage(null);
        },
        showUploadList: false, // We'll show our own preview
    };

    const handleOk = () => {
        if (fileList.length === 0 || !fileList[0].originFileObj) {
            message.warning('请先选择或粘贴一张图片');
            return;
        }
        onOk(fileList[0].originFileObj);
    };

    return (
        <Modal
            title="上传导览图"
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            width={600}
            destroyOnHidden
        >
            <div
                ref={pasteRef}
                tabIndex={0}
                onPaste={handlePaste}
                style={{ outline: 'none' }}
            >
                {!previewImage ? (
                    <Dragger {...uploadProps} style={{ padding: '20px' }}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                        <p className="ant-upload-hint">
                            支持粘贴 (Ctrl+V / Cmd+V)
                        </p>
                    </Dragger>
                ) : (
                    <div style={{ textAlign: 'center', position: 'relative', border: '1px solid #d9d9d9', borderRadius: '8px', padding: '8px' }}>
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                        />
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            shape="circle"
                            style={{ position: 'absolute', top: 16, right: 16 }}
                            onClick={() => {
                                setFileList([]);
                                setPreviewImage(null);
                            }}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

