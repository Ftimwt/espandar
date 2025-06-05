import React from 'react';
import MessageItem from './MessageItem';

const ChatMessages: React.FC = () => {
  return (
    <div className="flex-1 overflow-auto bg-gray-200 px-4 py-3">
      {/* تاریخ */}
      <div className="flex justify-center mb-2">
        <div className="bg-blue-50 rounded px-3 py-1 text-xs uppercase">
          February 20, 2018
        </div>
      </div>

      {/* پیام سیستم */}
      <div className="flex justify-center mb-3">
        <div className="bg-yellow-100 rounded px-3 py-2 text-xs text-gray-700">
          Messages to this chat and calls are now secured with end-to-end encryption.
        </div>
      </div>

      {/* پیام‌ها */}
      <MessageItem sender="Sylvester Stallone" message="Hi everyone! Glad you could join! I am making a new movie." time="12:45 pm" color="text-teal-600" />
      <MessageItem sender="Tom Cruise" message="Hi all! I have one question for the movie" time="12:45 pm" color="text-purple-600" />
      <MessageItem sender="Harrison Ford" message="Again?" time="12:45 pm" color="text-orange-600" />
      <MessageItem sender="Russell Crowe" message="Is Andrés coming for this one?" time="12:45 pm" color="text-orange-600" />
      <MessageItem sender="Sylvester Stallone" message="He is. Just invited him to join." time="12:45 pm" color="text-teal-600" />
      <MessageItem isMe message="Hi guys." time="12:45 pm" />
      <MessageItem isMe message="Count me in" time="12:45 pm" />
      <MessageItem sender="Tom Cruise" message="Get Andrés on this movie ASAP!" time="12:45 pm" color="text-purple-600" />
    </div>
  );
};

export default ChatMessages;