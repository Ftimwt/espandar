import React, { useEffect, useState } from 'react';
import { getMessages, sendMessage } from '../../api';

const Chat = ({ token }) => {
 const [messages, setMessages] = useState([]);
 const [messageText, setMessageText] = useState('');
 // اگر به این متغیرها نیاز دارید، آن‌ها را به درستی استفاده کنید
 const [receiverType] = useState('user'); // نوع گیرنده
 const [receiverId] = useState(''); // شناسه گیرنده

 useEffect(() => {
   const fetchMessages = async () => {
     const data = await getMessages(token, receiverType, receiverId);
     setMessages(data);
   };
   fetchMessages();
 }, [token, receiverType, receiverId]);

 const handleSendMessage = async (e) => {
   e.preventDefault();
   const messageData = { receiverType, receiverId, text: messageText };
   await sendMessage(token, messageData);
   setMessageText('');
   const updatedMessages = await getMessages(token, receiverType, receiverId);
   setMessages(updatedMessages);
 };

 return (
   <div>
     <h2>Chat</h2>
     <div>
       <h3>Messages</h3>
       {messages.map((msg, index) => (
         <div key={index}>
           <strong>{msg.sender}</strong>: {msg.text}
         </div>
       ))}
     </div>
     <form onSubmit={handleSendMessage}>
       <input
         type="text"
         value={messageText}
         onChange={(e) => setMessageText(e.target.value)}
         placeholder="Write a message..."
       />
       <button type="submit">Send</button>
     </form>
   </div>
 );
};

export default Chat;