import React from 'react';
import clsx from 'clsx';

type Props = {
  sender?: string;
  message: string;
  time: string;
  isMe?: boolean;
  color?: string;
};

const MessageItem: React.FC<Props> = ({ sender, message, time, isMe = false, color = 'text-gray-700' }) => {
  return (
    <div className={clsx('flex mb-2', isMe && 'justify-end')}>
      <div
        className={clsx(
          'rounded px-3 py-2 max-w-md',
          isMe ? 'bg-green-100' : 'bg-gray-100'
        )}
      >
        {!isMe && sender && <p className={`text-sm font-medium ${color}`}>{sender}</p>}
        <p className="text-sm mt-1">{message}</p>
        <p className="text-xs text-gray-400 text-right mt-1">{time}</p>
      </div>
    </div>
  );
};

export default MessageItem;