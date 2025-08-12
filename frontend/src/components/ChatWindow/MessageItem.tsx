import React, { useMemo } from 'react';
import clsx from 'clsx';
import type { ChannelRouteType } from '../../api/message.ts';
import MessageFile from './MesssageFile.tsx';
import { App, Dropdown, type MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { hashColor } from '../../utils/ui.ts';
import { getFullname } from '../../utils/user.ts';

type Props = {
  sender?: UserModel;
  message: string;
  time: string;
  isMe?: boolean;
  color?: string;
  files?: FileModel[];
  chatType?: ChannelRouteType;
  status?: 'read' | 'delivered' | 'sent';
  isEdited?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
  forwardedFrom?: string;
  
};

const MessageItem: React.FC<Props> = ({
  sender,
  message,
  time,
  isMe = false,
  chatType,
  status,
  files,
  isEdited,
  onEdit,
  onDelete,
  onForward,
  forwardedFrom,
}) => {
  const { modal } = App.useApp();

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

  const color = useMemo(() => {
    return hashColor(sender?.username || 'unknown');
  }, [sender]);

  const items: MenuProps['items'] = [
    ...(isMe && !message.startsWith('Forwarded from') && !files?.length
      ? [
          {
            key: 'edit',
            label: 'Edit',
          },
        ]
      : []),
    {
      key: 'delete',
      label: 'Delete',
    },
    {
      key: 'forward',
      label: 'Forward',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'edit') onEdit?.();
    if (key === 'forward') onForward?.();
    if (key === 'delete')
      modal.confirm({
        title: 'Are you sure you want to delete this message?',
        onOk: onDelete,
      });
  };

  const menuProps = {
    items,
    onClick: handleMenuClick,
  };

  return (
    <div className={clsx('flex mb-2', isMe && 'justify-end')}>
      <div
        className={clsx(
          'rounded px-3 py-2 max-w-md relative',
          isMe ? 'bg-green-100' : 'bg-gray-100',
        )}
      >
        <div className="absolute top-0 right-0">
          <Dropdown menu={menuProps} trigger={['click']}>
            <MoreOutlined className="cursor-pointer text-gray-500" />
          </Dropdown>
        </div>

        {!isMe && sender && chatType !== 'users' && (
          <p className={`text-sm font-medium ${color}`}>{getFullname(sender)}</p>
        )}

        {forwardedFrom && (
          <div className="text-xs italic text-gray-500 mb-1">
            Forwarded from {forwardedFrom}
          </div>
        )}

        {message && <p className="text-sm mt-1">{message}</p>}

        {files?.length ? (
          files.map((file) => <MessageFile file={file} key={`file-${file.id}`} />)
        ) : (
          <></>
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
