import React from 'react';
import UserAvatar from '../User/UserAvatar.tsx';
import { getFullname } from '../../utils/user.ts';
import { Link } from 'react-router';
import moment from 'moment';

type Props = {
  chat: ChatModel;
  selected?: boolean;
};

const ContactItem: React.FC<Props> = ({ chat, selected }) => {
  return (
    <Link
      to={`/chat/${chat.members[0].id}`}
      className={`px-3 py-3 flex items-center cursor-pointer hover:bg-gray-100 ${
        selected ? 'bg-gray-200' : 'bg-white'
      }`}
    >
      <UserAvatar user={chat.members[0]} />
      <div className="ml-4 flex-1 border-b border-gray-200 pb-1">
        <div className="flex justify-between text-sm font-semibold">
          <span>{getFullname(chat.members[0])}</span>
          <span className="text-gray-400 text-xs">{moment(chat.last_message_time).calendar()}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{chat.messages}</div>
      </div>
    </Link>
  );
};

export default ContactItem;
