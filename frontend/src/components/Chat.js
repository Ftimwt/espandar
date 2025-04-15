import React, { useEffect, useState } from 'react';
import { getMessages, sendMessage } from '../api';

const Chat = ({ token }) => {
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState('');

    useEffect(() => {
        const fetchMessages = async () => {
            const result = await getMessages(token);
            setMessages(result);
        };
        fetchMessages();
    }, [token]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        await sendMessage({ content });
        setContent('');
    };

    return (
        <div>
            <div>
                {messages.map((msg) => (
                    <div key={msg.id}>{msg.content}</div>
                ))}
            </div>
            <form onSubmit={handleSendMessage}>
                <input 
                    type="text" 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default Chat;