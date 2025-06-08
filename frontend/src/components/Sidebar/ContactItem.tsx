import React, { useMemo } from 'react';
import { getFullname } from '../../utils/user.ts';
import { Link, useParams } from 'react-router';
import moment from 'moment';
import ChatAvatar from '../Chat/ChatAvatar.tsx';

type Props = {
  chat: ChatModel;
};

const ContactItem: React.FC<Props> = ({ chat }) => {
  const { uuid: uuidStr, receiverType } = useParams();
  const uuid = Number.parseInt(uuidStr || '0');

  const name = useMemo(() => {
    if (chat.type === 'private_chat') return getFullname(chat.members[0]);
    return chat.name;
  }, [chat]);

  const chatID = useMemo(() => {
    if (chat.type === 'private_chat') return chat.members[0].id;
    return chat.id;
  }, [chat]);

  const routeType = useMemo<string>(() => {
    if (chat.type === 'private_chat') return 'users';
    else if (chat.type === 'group_chat') return 'groups';
    return 'channels';
  }, [chat]);

  const isSelected = useMemo(() => {
    return chatID == uuid && routeType === receiverType;
  }, [chatID, uuid, routeType, receiverType]);

  return (
    <Link
      to={`/chat/${routeType}/${chatID}`}
      className={`px-3 py-3 flex items-center cursor-pointer hover:bg-gray-100 ${
        isSelected ? 'bg-gray-200' : 'bg-white'
      }`}
    >
      <ChatAvatar chat={chat} />
      <div className="ml-4 flex-1 border-b border-gray-200 pb-1">
        <div className="flex justify-between text-sm font-semibold">
          <span>{name}</span>
          <span className="text-gray-400 text-xs">{moment(chat.last_message_time).calendar()}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{chat.messages}</div>
      </div>
    </Link>
  );
};

export default ContactItem;
