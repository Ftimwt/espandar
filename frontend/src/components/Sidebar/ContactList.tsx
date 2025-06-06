import React from 'react';
import ContactItem from './ContactItem';
import { useGetChatList } from '../../api/chats.ts';
import { useParams } from 'react-router';

const ContactList: React.FC = () => {
  const { data } = useGetChatList();

  const params = useParams();

  const uuid = Number.parseInt(params.uuid || '0');

  console.log('selected member', uuid, data?.data.chats[0].members[0].id);

  return (
    <div className="flex-1 overflow-auto">
      {data?.data.chats.map((c, i) => (
        <ContactItem key={i} chat={c} selected={c.members[0].id == uuid} />
      ))}
    </div>
  );
};

export default ContactList;
