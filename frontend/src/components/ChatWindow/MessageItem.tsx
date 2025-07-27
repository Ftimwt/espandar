import React from 'react';
import clsx from 'clsx';
import type { ChannelRouteType } from '../../api/message.ts';
import MessageFile from './MesssageFile.tsx';
import { Dropdown, Menu } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

type Props = {
  sender?: string;
  message: string;
  time: string;
  isMe?: boolean;
  color?: string;
  files?: FileModel[];
  chatType?: ChannelRouteType;
  status?: 'read' | 'delivered' | 'sent';
  fileURL?: string;
  fileType?: string;
  isEdited?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
};

const MessageItem: React.FC<Props> = ({
  sender,
  message,
  time,
  isMe = false,
  color = 'text-gray-700',
  chatType,
  status,
  files,
  fileURL,
  fileType,
  isEdited,
  onEdit,
  onDelete,
  onForward,
}) => {
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

  const menu = (
    <Menu>
      {isMe && !message.startsWith('Forwarded from') && !fileURL && (
        <Menu.Item key="edit" onClick={onEdit}>
          Edit
        </Menu.Item>
      )}
      <Menu.Item key="delete" onClick={onDelete}>
        Delete
      </Menu.Item>
      <Menu.Item key="forward" onClick={onForward}>
        Forward
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={clsx('flex mb-2', isMe && 'justify-end')}>
      <div className={clsx('rounded px-3 py-2 max-w-md relative', isMe ? 'bg-green-100' : 'bg-gray-100')}>
        {/* منوی عملیات */}
        <div className="absolute top-0 right-0">
          <Dropdown overlay={menu} trigger={['click']}>
            <MoreOutlined className="cursor-pointer text-gray-500" />
          </Dropdown>
        </div>

        {!isMe && sender && chatType !== 'users' && (
          <p className={`text-sm font-medium ${color}`}>{sender}</p>
        )}

        {/* متن پیام */}
        {message && (
        <p
        className="text-sm mt-1 break-words text-blue-600"
        dangerouslySetInnerHTML={{ __html: message.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="underline text-blue-500" target="_blank" rel="noopener noreferrer">$1</a>') }}
        />
        )}
        {/* فایل‌های ارسالی */}
        {files?.length ? (
          files.map((file) => <MessageFile file={file} key={`file-${file.id}`} />)
        ) : (
          <></>
        )}

        {/* عکس */}
        {fileType?.startsWith('image') && fileURL && (
          <img src={fileURL} alt="uploaded" className="mt-2 max-w-xs rounded" />
        )}

        {/* ویدیو */}
        {fileType?.startsWith('video') && fileURL && (
          <video src={fileURL} controls className="mt-2 max-w-xs rounded" />
        )}

        {/* ویس */}
        {fileType?.startsWith('audio') && fileURL && (
          <audio src={fileURL} controls className="mt-2 w-full" />
        )}

        {/* فایل‌های دیگر */}
        {fileURL &&
          !fileType?.startsWith('image') &&
          !fileType?.startsWith('video') &&
          !fileType?.startsWith('audio') && (
            <a href={fileURL} target="_blank" rel="noreferrer" className="text-blue-500 text-sm mt-2 block">
              Download file
            </a>
          )}

        <p className="text-xs text-gray-400 text-right mt-1">
          {time}
          {isEdited && <span className="ml-2 text-gray-400">(edited)</span>}
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
