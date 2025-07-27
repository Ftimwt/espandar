import { Button, List, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import CreateConferenceModal from './CreateConferenceModal';
import { useTokenStore } from '../../store/useToken'; // 👈 اضافه برای توکن
import { authClient } from '../../api/api'; // 👈 اضافه برای جلوگیری از cache و احراز هویت

type Conference = {
  id: number;
  title: string;
  scheduledAt: string;
};

const ConferenceList = () => {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { token } = useTokenStore(); // 👈 گرفتن توکن برای درخواست با هویت

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = () => {
  if (!token) return; // ⛔ اگر توکن نداریم، بی‌خیال

  authClient(token)
    .get(`/conferences?ts=${Date.now()}`)
    .then((res) => {
      console.log('🎯 Loaded conferences:', res.data);
      setConferences(res.data.conferences);
    })
    .catch((err) => {
      console.error('❌ Failed to load conferences:', err);
      message.error('Failed to load conferences');
    });
};

  return (
    <div className="p-6 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">My Conferences</h2>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          ➕ Create Conference
        </Button>
      </div>

      <List
        bordered
        dataSource={conferences}
        renderItem={(conf) => (
          <List.Item
            actions={[
              <Button key="join" type="link" onClick={() => navigate(`/conference/${conf.id}`)}>
                Join
              </Button>,
            ]}
          >
            <List.Item.Meta title={conf.title} description={conf.scheduledAt} />
          </List.Item>
        )}
      />

      <CreateConferenceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchConferences(); // رفرش لیست
          setModalOpen(false); // بستن مودال
        }}
      />
    </div>
  );
};

export default ConferenceList;
