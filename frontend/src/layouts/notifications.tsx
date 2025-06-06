import { Outlet, useNavigate } from 'react-router';
import { useWebSocket } from '../context/websocket.tsx';
import { useEffect } from 'react';
import { notification } from 'antd';

const NotificationLayout = () => {
  const { subscribe, unsubscribe } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    subscribe('notification', (data: { data: Partial<{ message: string; link: string }> }) => {
      notification.info({
        message: data.data?.message,
        onClick: () => (data.data?.link ? navigate(data.data?.link) : undefined),
      });
      console.log(data.data.message);
    });
    return () => unsubscribe('notification', () => {});
  }, [unsubscribe, unsubscribe]);

  return <Outlet />;
};

export default NotificationLayout;
