import React from 'react';
import clsx from 'clsx';
import type { ChannelRouteType } from "../../api/message.ts";

type Props = {
  sender?: string;
  message: string;
  time: string;
  isMe?: boolean;
  color?: string;
  chatType?: ChannelRouteType;
  status?: 'read' | 'delivered' | 'sent';
  fileURL?: string;
  fileType?: string;
};

const MessageItem: React.FC<Props> = ({ sender, message, time, isMe = false, color = 'text-gray-700', chatType, status, fileURL, fileType }) => {
  const renderStatus = () => {
    if (!isMe || !status) return null;
    switch (status) {
      case 'sent':
        return '✓ Sent';
      case 'delivered':
        return '✓✓ Delivered';
      case 'read':
        return '✓✓ Read';
      default:
        return null;
    }
  };

  return (
    <div className={clsx('flex mb-2', isMe && 'justify-end')}>
      <div className={clsx('rounded px-3 py-2 max-w-md', isMe ? 'bg-green-100' : 'bg-gray-100')}>
        {!isMe && sender && chatType !== 'users' && <p className={`text-sm font-medium ${color}`}>{sender}</p>}
        {message && <p className="text-sm mt-1">{message}</p>}

        {/* نمایش عکس */}
        {fileType?.startsWith('image') && fileURL && (
          <img src={fileURL} alt="uploaded" className="mt-2 max-w-xs rounded" />
        )}

        {/* نمایش ویدیو */}
        {fileType?.startsWith('video') && fileURL && (
          <video src={fileURL} controls className="mt-2 max-w-xs rounded" />
        )}

        {/* نمایش لینک برای فایل‌های دیگر */}
        {fileURL && !fileType?.startsWith('image') && !fileType?.startsWith('video') && (
          <a href={fileURL} target="_blank" rel="noreferrer" className="text-blue-500 text-sm mt-2 block">
            دانلود فایل
          </a>
        )}

        <p className="text-xs text-gray-400 text-right mt-1">
          {time}
          {isMe && status && (
            <>
              {' '}
              • <span className="text-blue-500">{renderStatus()}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default MessageItem;
