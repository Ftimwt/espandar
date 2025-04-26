import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

const Chat = () => {
    const { id } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const token = localStorage.getItem('token');
    const userId = parseInt(localStorage.getItem('user_id'), 10);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null); // استفاده از useRef برای socket

    // WebSocket connection with reconnection
    useEffect(() => {
        if (!id || isNaN(id)) {
            setError('شناسه کاربر نامعتبر است');
            console.error('Chat: Invalid receiverId:', id);
            return;
        }

        if (!token) {
            setError('توکن ورود یافت نشد');
            console.error('Chat: No token found');
            return;
        }

        if (isNaN(userId)) {
            setError('شناسه کاربر نامعتبر است');
            console.error('Chat: Invalid userId:', localStorage.getItem('user_id'));
            return;
        }

        const connectWebSocket = () => {
            console.log('Chat: Attempting WebSocket connection with token:', token.slice(0, 10) + '...');

            const ws = new WebSocket(`ws://localhost:8080/ws?Authorization=${token}`);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('Chat: WebSocket connected');
                setError('');
            };

            ws.onmessage = (event) => {
                console.log('Chat: Raw WebSocket message:', event.data);
                let message;
                try {
                    message = JSON.parse(event.data);
                } catch (err) {
                    console.error('Chat: Error parsing WebSocket message:', err);
                    return;
                }
                console.log('Chat: Parsed message:', message);

                switch (message.event) {
                    case 'connect_success':
                        console.log('Chat: WebSocket connect success:', message.data);
                        break;
                    case 'new_message':
                        console.log('Chat: New message received:', message.data);
                        setMessages((prevMessages) => [
                            ...prevMessages,
                            {
                                id: message.data.ID,
                                content: message.data.Content,
                                sender_id: message.data.SenderID,
                                receiver_id: message.data.UserID,
                                created_at: message.data.CreatedAt,
                                seen: message.data.Seen,
                                is_received: message.data.IsReceived,
                                type: message.data.Type,
                                files: message.data.Files || [],
                            },
                        ]);
                        break;
                    default:
                        console.log('Chat: Unknown event:', message.event);
                }
            };

            ws.onclose = (event) => {
                console.log('Chat: WebSocket disconnected, code:', event.code, 'reason:', event.reason);
                setError('اتصال به سرور قطع شد، در حال تلاش مجدد...');
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = (err) => {
                console.error('Chat: WebSocket error:', err);
                setError('خطا در اتصال به سرور');
            };
        };

        connectWebSocket();return () => {
            console.log('Chat: Closing WebSocket');
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [token, id, userId]);

    // Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            if (!id || isNaN(id)) {
                setError('شناسه کاربر نامعتبر است');
                return;
            }
            try {
                console.log('Chat: Fetching messages for receiver:', id);
                const response = await axios.get(
                    `http://localhost:8080/messages/user/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                console.log('Chat: Messages response:', response.data);
                setMessages(response.data);
            } catch (error) {
                console.error('Chat: Error fetching messages:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                });
                setError('خطا در بارگذاری پیام‌ها');
            }
        };

        fetchMessages();
    }, [id, token]);

    // Scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const onEmojiClick = (emojiObject) => {
        setNewMessage((prev) => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleFileChange = (e) => {
        setSelectedFiles(e.target.files);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            setAudioChunks([]);

            recorder.ondataavailable = (e) => {
                setAudioChunks((prev) => [...prev, e.data]);
            };

            recorder.start();
            setRecording(true);
            console.log('Chat: Started recording');
        } catch (error) {
            console.error('Chat: Error starting recording:', error);
            setError('خطا در شروع ضبط صدا');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            setRecording(false);
            console.log('Chat: Stopped recording');
        }
    };

    const handleSendMessage = async () => {
        if (!id || isNaN(id)) {
            setError('شناسه کاربر نامعتبر است');
            return;
        }
        try {
            const formData = new FormData();
            let messageType = 'text';
            if (newMessage.trim()) {
                formData.append('content', newMessage);
            }
            if (selectedFiles.length > 0) {
                for (let i = 0; i < selectedFiles.length; i++) {
                    formData.append('files', selectedFiles[i]);
                }
                messageType = 'file';
            }
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                formData.append('files', audioBlob, 'voice.webm');
                messageType = 'voice';
            }
            if (!newMessage.trim() && selectedFiles.length === 0 && audioChunks.length === 0) {
                setError('پیام، فایل یا ویس نمی‌تواند خالی باشد');
                console.log('Chat: Empty message/files/voice');
                return;
            }

            formData.append('type', messageType);console.log('Chat: Sending message/files/voice');
            const response = await axios.post(
                `http://localhost:8080/message/user/${id}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            console.log('Chat: Send response:', response.data);

            // ارسال پیام به WebSocket برای پخش real-time
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                const messageData = {
                    ID: response.data.message_id,
                    Content: newMessage || '',
                    SenderID: userId,
                    UserID: parseInt(id, 10),
                    CreatedAt: new Date().toISOString(),
                    Seen: false,
                    IsReceived: false,
                    Type: messageType,
                    Files: selectedFiles.length > 0 || audioChunks.length > 0
                        ? Array.from(selectedFiles).map((file) => ({
                              FilePath: `./Uploads/${file.name}`,
                              Type:
                                  file.name.endsWith('.mp3') ||
                                  file.name.endsWith('.wav') ||
                                  file.name === 'voice.webm'
                                      ? 'voice'
                                      : file.name.endsWith('.mp4') || file.name.endsWith('.webm')
                                      ? 'video'
                                      : file.name.endsWith('.jpg') ||
                                        file.name.endsWith('.png') ||
                                        file.name.endsWith('.jpeg')
                                      ? 'picture'
                                      : 'default',
                          }))
                        : [],
                };

                socketRef.current.send(JSON.stringify({
                    event: 'new_message',
                    data: messageData,
                }));
                console.log('Chat: Sent message to WebSocket:', messageData);
            } else {
                console.warn('Chat: WebSocket not connected, cannot send message');
            }

            // به‌روزرسانی پیام‌ها در UI
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    id: response.data.message_id,
                    content: newMessage || '',
                    sender_id: userId,
                    receiver_id: parseInt(id, 10),
                    created_at: new Date().toISOString(),
                    seen: false,
                    is_received: false,
                    type: messageType,
                    files: selectedFiles.length > 0 || audioChunks.length > 0
                        ? Array.from(selectedFiles).map((file) => ({
                              FilePath: `./Uploads/${file.name}`,
                              Type:
                                  file.name.endsWith('.mp3') ||
                                  file.name.endsWith('.wav') ||
                                  file.name === 'voice.webm'
                                  ? 'voice'
                                  : file.name.endsWith('.mp4') || file.name.endsWith('.webm')
                                  ? 'video'
                                  : file.name.endsWith('.jpg') ||
                                    file.name.endsWith('.png') ||
                                    file.name.endsWith('.jpeg')
                                  ? 'picture'
                                  : 'default',
                          }))
                        : [],
                },
            ]);setNewMessage('');
            setSelectedFiles([]);
            setAudioChunks([]);
            setError('');
        } catch (error) {
            console.error('Chat: Error sending message:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            setError(
                error.response?.data?.error || `خطا در ارسال پیام: ${error.message}`
            );
        }
    };

    return (
        <div className="chat-container">
            <h2>چت با کاربر {id}</h2>
            {error && <p className="error">{error}</p>}
            <div className="messages">
                {messages.length === 0 ? (
                    <p>هیچ پیامی وجود ندارد</p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message ${
                                msg.sender_id === userId ? 'sent' : 'received'
                            }`}
                        >
                            {msg.content && <p>{msg.content}</p>}
                            {msg.files &&
                                msg.files.length > 0 &&
                                msg.files.map((file, index) => (
                                    <div key={index}>
                                        {file.Type === 'picture' && (
                                            <img src={file.FilePath} alt="عکس" style={{ maxWidth: '200px' }} />
                                        )}
                                        {file.Type === 'video' && (
                                            <video controls style={{ maxWidth: '200px' }}>
                                                <source src={file.FilePath} type="video/mp4" />
                                            </video>
                                        )}
                                        {file.Type === 'voice' && (
                                            <audio controls>
                                                <source src={file.FilePath} type="audio/webm" />
                                            </audio>
                                        )}
                                        {file.Type === 'default' && (
                                            <a href={file.FilePath} download>
                                                {file.FilePath.split('/').pop()}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-container">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                {showEmojiPicker && <EmojiPicker onEmojiClick={onEmojiClick} />}
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="پیام خود را بنویسید..."
                />
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf,.doc,.docx"
                />
                <button onClick={recording ? stopRecording : startRecording}>
                    {recording ? 'توقف ضبط' : 'شروع ضبط ویس'}
                </button>
                <button onClick={handleSendMessage}>ارسال</button>
            </div>
        </div>
    );
};

export default Chat;