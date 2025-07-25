import {DatePicker, Form, Input, Modal, notification, Select} from 'antd';
import UserAvatar from '../User/UserAvatar';
import {getFullname} from '../../utils/user';
import {useGetUsersList} from "../../api/user";
import {useCreateConference} from "../../api/conference.ts";
import {useEffect} from "react";

const CreateConferenceModal = ({open, onClose}: { open: boolean; onClose: () => void }) => {
    const [api, contextHolder] = notification.useNotification();

    const [form] = Form.useForm<CreateConferenceRequest>();
    const {data: userResponse} = useGetUsersList();
    const users = userResponse?.data.users || [];
    const {data, mutate, error} = useCreateConference();

    const handleOkClick = async () => {
        form.submit();
    };

    const handleFinish = (data: CreateConferenceRequest) => {
        mutate(data);
    }

    useEffect(() => {
        if (data && 'data' in data) {
            api.success({message: data.data.message});
        }
    }, [data]);

    useEffect(() => {
        if (!error) return;
        api.error('خطایی در ایجاد رخ داده است');
    }, [error]);

    return (
        <Modal open={open} onCancel={onClose} onOk={handleOkClick} title="Create Conference">
            {contextHolder}
            <Form<CreateConferenceRequest> form={form} onFinish={handleFinish}>
                <Form.Item
                    name="title"
                    label="Title">
                    <Input
                        placeholder="Title"
                        style={{marginBottom: 10}}
                        name="title"
                    />
                </Form.Item>
                <Form.Item name="participants" label="Participants">
                    <Select
                        mode="multiple"
                        placeholder="Select Participants"
                        style={{width: '100%', marginBottom: 10}}
                        optionLabelProp="label"
                    >
                        {Array.isArray(users) &&
                            users.map((u) => (
                                <Select.Option
                                    key={u.id}
                                    value={u.id}
                                    label={getFullname(u)}
                                >
                                    <div className="flex items-center gap-2">
                                        <UserAvatar user={u}/>
                                        {getFullname(u)}
                                    </div>
                                </Select.Option>
                            ))}
                    </Select>
                </Form.Item>
                <Form.Item name="scheduled_at" label="Scheduled at">
                    <DatePicker
                        showTime
                        style={{width: '100%'}}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CreateConferenceModal;
