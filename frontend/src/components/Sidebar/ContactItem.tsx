import React, {useMemo} from 'react';
import {getFullname} from '../../utils/user.ts';
import {Link, useParams} from 'react-router';
import moment from 'moment';
import ChatAvatar from '../Chat/ChatAvatar.tsx';
import {useUserStore} from '../../store/userStore.ts';

type Props = {
  chat: ChatModel;
};

const ContactItem: React.FC<Props> = ({chat}) => {
  const {uuid: uuidStr, receiverType} = useParams();
  const uuid = Number.parseInt(uuidStr || '0');
  const {user} = useUserStore();

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

  const lastMessage = useMemo(() => {
    if (!chat.last_message) return 'No message';

    let msg: string = chat.last_message.text;
    if (msg.length == 0 && chat.last_message.files?.length > 0) {
      let fileType = chat.last_message.files[0].type;
      if (fileType == 'image') {
        msg = 'Image';
      } else if (fileType == 'audio') {
        msg = 'Audio';
      } else if (fileType == 'video') {
        msg = 'Video';
      } else if (fileType == 'file') {
        msg = 'File';
      }
    }

    if (chat.type == 'private_chat') return msg;
    const fullName =
      user?.id == chat.last_message.sender.id ? 'You' : getFullname(chat.last_message.sender);
    return `<b>${fullName}</b>: ${msg}`;
  }, [chat]);

  return (
    <Link
      to={`/chat/${routeType}/${chatID}`}
      className={`px-4 py-4 border-b-gray-200 border-b flex items-center cursor-pointer hover:bg-gray-100 text-gray-700! ${
        isSelected ? 'bg-gray-200!' : 'bg-white!'
      }`}
    >
      <ChatAvatar chat={chat}/>
      <div className="ml-4 flex-1 border-b border-gray-200 pb-1">
        <div className="flex justify-between text-sm font-semibold">
          <span>{name}</span>
          <span className="text-gray-400 text-xs">{moment(chat.last_message_time).calendar()}</span>
        </div>
        <div className="text-xs  text-gray-500 truncate w-[200px]" dangerouslySetInnerHTML={{__html: lastMessage}}/>
      </div>
    </Link>
  );
};

export default ContactItem;
