import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Form,
  Input,
  Popover,
  Space,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { getFullname } from '../../utils/user.ts';
import { useUserStore } from '../../store/userStore.ts';
import { prefixUrl } from '../../api/api.ts';
import { useUploadFile } from '../../api/message.ts';
import { useUpdateUserProfile } from '../../api/user.ts';
import { useTokenStore } from '../../store/useToken.ts';
import { useNavigate } from 'react-router';

const UserPopover: React.FC = () => {
  const { user, logout, updateProfile } = useUserStore();
  const { clearToken } = useTokenStore();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [avatarPath, setAvatarPath] = useState<string | undefined>();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: updateProfileMutation, isPending: isSaving } = useUpdateUserProfile();

  useEffect(() => {
    if (!user) return;
    form.setFieldsValue({ firstname: user.firstname, lastname: user.lastname });
    setAvatarPath(undefined);
  }, [form, user]);

  const firstLetter = useMemo(() => user?.username && user.username[0].toUpperCase(), [user]);

  const avatarPreview = useMemo(() => {
    const current = avatarPath ?? user?.avatar;
    if (!current) return undefined;
    if (current.startsWith('http://') || current.startsWith('https://')) {
      return current;
    }
    return prefixUrl(current);
  }, [avatarPath, user?.avatar]);

  if (!user) return null;

  const handleLogout = () => {
    clearToken();
    logout();
    void message.success('با موفقیت خارج شدید');
    navigate('/auth');
  };

  const handleRemoveAvatar = () => {
    if (!avatarPath && !user?.avatar) {
      return;
    }
    setAvatarPath('');
    void message.info('عکس پروفایل برای حذف آماده شد، برای اعمال ذخیره کنید');
  };

  const uploadHandler: UploadProps['beforeUpload'] = async (file) => {
    try {
      const response = await uploadFile({ file, name: file.name });
      const uploadedPath = response.data?.file_url || response.data?.path;
      if (uploadedPath) {
        setAvatarPath(uploadedPath);
        void message.success('عکس پروفایل با موفقیت بارگذاری شد');
      } else {
        void message.error('پاسخ نامعتبر از سرور دریافت شد');
      }
    } catch (error) {
      console.error('error during avatar upload', error);
      void message.error('خطا در بارگذاری عکس پروفایل');
    }
    return false;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: UpdateProfileRequest = {};
      if (values.firstname !== user.firstname) {
        payload.firstname = values.firstname;
      }
      if (values.lastname !== user.lastname) {
        payload.lastname = values.lastname;
      }
      if (avatarPath !== undefined && avatarPath !== user.avatar) {
        payload.avatar = avatarPath;
      }

      if (!Object.keys(payload).length) {
        void message.info('تغییری برای ذخیره وجود ندارد');
        return;
      }

      const response = await updateProfileMutation(payload);
      updateProfile(response.data.user);
      setAvatarPath(undefined);
      void message.success('پروفایل شما با موفقیت به‌روزرسانی شد');
      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        console.error('error during profile update', error);
      }
      void message.error('خطا در به‌روزرسانی پروفایل');
    }
  };

  const content = (
    <div className="w-64">
      <div className="flex flex-col items-center text-center mb-3">
        <Avatar src={avatarPreview} size={64}>
          {firstLetter}
        </Avatar>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={uploadHandler}
        >
          <Button size="small" className="mt-2" icon={<UploadOutlined />} loading={isUploading}>
            انتخاب عکس
          </Button>
        </Upload>
        <Button size="small" className="mt-2" onClick={handleRemoveAvatar} disabled={!avatarPath && !user.avatar}>
          حذف عکس پروفایل
        </Button>
      </div>
      <Typography.Text strong className="block text-center">
        {getFullname(user)}
      </Typography.Text>
      <Typography.Paragraph className="text-xs text-gray-500 mb-2 truncate text-center">
        {user.username}
      </Typography.Paragraph>
      {user.status && (
        <div
          className={`text-xs mb-3 text-center ${
            user.status === 'online' ? 'text-green-500' : 'text-gray-400'
          }`}
        >
          {user.status === 'online' ? '🟢 آنلاین' : '⚪️ آفلاین'}
        </div>
      )}
      <Form form={form} layout="vertical" size="small">
        <Form.Item label="نام" name="firstname">
          <Input placeholder="نام" />
        </Form.Item>
        <Form.Item label="نام خانوادگی" name="lastname">
          <Input placeholder="نام خانوادگی" />
        </Form.Item>
      </Form>
      <Space direction="vertical" size="small" className="w-full">
        <Button type="primary" block onClick={handleSave} loading={isSaving}>
          اعمال تغییرات
        </Button>
        <Button danger block onClick={handleLogout}>
          خروج
        </Button>
      </Space>
    </div>
  );

  return (
    <Tooltip title={user.username} placement="top">
      <Popover content={content} trigger="click" placement="bottomLeft">
        <Avatar src={avatarPreview} size="large" className="cursor-pointer">
          {firstLetter}
        </Avatar>
      </Popover>
    </Tooltip>
  );
};

export default UserPopover;