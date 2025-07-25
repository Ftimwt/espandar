import { Button, List, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import CreateConferenceModal from './CreateConferenceModal';

type Conference = {
  id: number;
  title: string;
  scheduledAt: string;
};

const ConferenceList = () => {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = () => {
    axios
      .get('/conference')
      .then((res) => setConferences(res.data.conferences))
      .catch(() => message.error('Failed to load conferences'));
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
        onClose={() => {
          setModalOpen(false);
          fetchConferences(); // Refresh after new creation
        }}
      />
    </div>
  );
};

export default ConferenceList;
