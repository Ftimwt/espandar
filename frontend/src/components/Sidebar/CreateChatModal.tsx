import React from 'react';
import { Button, Form, Input, Modal, Select } from 'antd';
import { useGetUsersList } from '../../api/user.ts';
import { getFullname } from '../../utils/user.ts';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    type: 'group' | 'channel';
    name: string;
    description?: string;
    members: number[];
  }) => void;
  type: 'group' | 'channel' | null;
};

const CreateChatModal: React.FC<Props> = ({ open, onClose, onCreate, type }) => {
  const { data } = useGetUsersList();
  const [form] = Form.useForm();

  const users = data?.data.users || [];

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onCreate({ ...values, type: type! });
      form.resetFields();
      onClose();
    });
  };

  return (
    <Modal
      title={`Create ${type === 'group' ? 'Group' : 'Channel'}`}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="create" type="primary" onClick={handleSubmit}>
          Create
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter a name.' }]}
        >
          <Input placeholder="Enter a name..." />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Optional description..." />
        </Form.Item>

        <Form.Item
          name="members"
          label={type === 'group' ? 'Select Members' : 'Select subscribers'}
          rules={[{ required: true, message: 'Please select at least one user.' }]}
        >
          <Select
            mode="multiple"
            placeholder="Choose users..."
            options={users.map((user) => ({
              label: getFullname(user),
              value: user.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateChatModal;
