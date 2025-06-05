import React from 'react';
import { Avatar } from 'antd';

type Props = {
  avatar: string;
  name: string;
  message: string;
  time: string;
  selected?: boolean;
};

const ContactItem: React.FC<Props> = ({ avatar, name, message, time, selected }) => {
  return (
    <div
      className={`px-3 py-3 flex items-center cursor-pointer hover:bg-gray-100 ${
        selected ? 'bg-gray-200' : 'bg-white'
      }`}
    >
      <Avatar src={avatar} size="large" />
      <div className="ml-4 flex-1 border-b border-gray-200 pb-1">
        <div className="flex justify-between text-sm font-semibold">
          <span>{name}</span>
          <span className="text-gray-400 text-xs">{time}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{message}</div>
      </div>
    </div>
  );
};

export default ContactItem;