import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Popconfirm, Switch } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { Spot } from '../../api';

interface SpotEditModalProps {
    open: boolean;
    spot: Spot | null;
    onOk: (spot: Spot) => void;
    onCancel: () => void;
    onDelete?: (spot: Spot) => void;
}

export const SpotEditModal: React.FC<SpotEditModalProps> = ({ open, spot, onOk, onCancel, onDelete }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open && spot) {
            form.setFieldsValue({
                ...spot,
                show_in_list: !spot.hide_in_list
            });
        } else {
            form.resetFields();
            // Default show_in_list to true if new? But modal is for edit.
            // When opening modal for existing spot, respect its value.
        }
    }, [open, spot, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (spot) {
                const { show_in_list, ...rest } = values;
                onOk({
                    ...spot,
                    ...rest,
                    hide_in_list: !show_in_list
                });
            }
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    return (
        <Modal
            title="编辑地点"
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            destroyOnClose
            footer={[
                onDelete && spot && (
                    <Popconfirm
                        key="delete"
                        title="确定删除该地点吗？"
                        onConfirm={() => onDelete(spot)}
                        okText="删除"
                        cancelText="取消"
                    >
                        <Button danger icon={<DeleteOutlined />} style={{ float: 'left' }}>
                            删除
                        </Button>
                    </Popconfirm>
                ),
                <Button key="cancel" onClick={onCancel}>
                    取消
                </Button>,
                <Button key="submit" type="primary" onClick={handleOk}>
                    确定
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="icon"
                    label="图标"
                >
                    <Select>
                        <Select.Option value="">默认 (Default)</Select.Option>
                        <Select.Option value="flag">旗帜 (Flag)</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item
                    name="show_in_list"
                    label="显示在景点列表中"
                    valuePropName="checked"
                    initialValue={true}
                >
                    <Switch />
                </Form.Item>
                <Form.Item name="time" label="时间">
                    <Input />
                </Form.Item>
                <Form.Item name="interior" label="内部">
                    <Input />
                </Form.Item>
                <Form.Item name="story" label="典故">
                    <Input.TextArea />
                </Form.Item>
            </Form>
        </Modal>
    );
};
