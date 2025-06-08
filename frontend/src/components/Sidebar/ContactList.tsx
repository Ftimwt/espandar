import React from 'react';
import ContactItem from './ContactItem';
import { useGetChatList } from '../../api/chats.ts';

const ContactList: React.FC = () => {
  const { data } = useGetChatList();

  return (
    <div className="flex-1 overflow-auto">
      {data?.data.chats.map((c, i) => <ContactItem key={i} chat={c} />)}
    </div>
  );
};

export default ContactList;
