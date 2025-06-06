import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useGetUserInfo } from '../api/user.ts';
import { Spin } from 'antd';
import { useUserStore } from '../store/userStore.ts';
import { WebSocketProvider } from '../context/websocket.tsx';

const AuthLayout = () => {
  const { error, data, isLoading } = useGetUserInfo();
  const { login } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!error) return;
    navigate('/auth');
  }, [error]);

  useEffect(() => {
    if (!data) return;
    login(data.data.user);
  }, [data]);

  if (isLoading) {
    return <Spin />;
  }

  return (
    <WebSocketProvider userId={data?.data.user.id!}>
      <Outlet />
    </WebSocketProvider>
  );
};

export default AuthLayout;
