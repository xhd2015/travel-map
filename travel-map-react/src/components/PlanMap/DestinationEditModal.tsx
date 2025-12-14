import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';

interface DestinationEditModalProps {
    open: boolean;
    initialName?: string;
    onOk: (name: string) => void;
    onCancel: () => void;
}

export const DestinationEditModal: React.FC<DestinationEditModalProps> = ({ open, initialName, onOk, onCancel }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.setFieldsValue({ name: initialName || '' });
        } else {
            form.resetFields();
        }
    }, [open, initialName, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            onOk(values.name);
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    return (
        <Modal
            title={initialName ? "更新目的地" : "设置目的地"}
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="name"
                    label="目的地名称"
                    rules={[{ required: true, message: '请输入目的地名称' }]}
                >
                    <Input placeholder="例如：上海迪士尼乐园" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

