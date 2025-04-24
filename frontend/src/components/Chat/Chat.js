import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
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
    const [socket, setSocket] = useState(null); // ذخیره socket در state
    const token = localStorage.getItem('token');
    const messagesEndRef = useRef(null);

    // اعتبارسنجی id
    useEffect(() => {
        if (!id || isNaN(id)) {
            setError('شناسه کاربر نامعتبر است');
            console.error('Chat: Invalid receiverId:', id);
        }
    }, [id]);

    // اتصال به WebSocket
    useEffect(() => {
        if (!token) {
            setError('توکن ورود یافت نشد');
            console.error('Chat: No token found');
            return;
        }

        console.log('Chat: Attempting WebSocket connection with token:', token);

        const newSocket = io('http://localhost:8080', {
            query: { Authorization: token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        });

        setSocket(newSocket); // ذخیره socket در state

        newSocket.on('connect', () => {
            console.log('Chat: Connected to WebSocket');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Chat: WebSocket connection error:', {
                message: err.message,
                description: err.description,
                context: err.context,
                status: err.status,
            });
            setError(`خطا در اتصال به سرور: ${err.message}`); // اصلاح استفاده از backticks
        });

        newSocket.on('error', (err) => {
            console.error('Chat: WebSocket server error:', {
                message: err.message,
                description: err.description,
                context: err.context,
                status: err.status,
            });
            setError(`خطا در سرور: ${err.message}`); // اصلاح استفاده از backticks
        });

        newSocket.on('new_message', (message) => {
            console.log('Chat: Received new message:', message);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    id: message.ID,
                    content: message.Content,
                    sender_id: message.SenderID,
                    receiver_id: message.UserID,
                    created_at: message.CreatedAt,
                    seen: message.Seen,
                    is_received: message.IsReceived,
                    type: message.Type,
                    files: message.Files || [],
                },
            ]);
        });

        return () => {
            newSocket.disconnect();
            console.log('Chat: Disconnected from WebSocket');
            setSocket(null);
        };
    }, [token]);

    // بارگذاری پیام‌های اولیه
    useEffect(() => {
        const fetchMessages = async () => {
            if (!id || isNaN(id)) {
                setError('شناسه کاربر نامعتبر است');
                return;
            }
            try {
                console.log('Chat: Fetching messages for receiver:', id);
                const response = await axios.get(
                    `http://localhost:8080/messages/user/${id}`, // اصلاح استفاده از backticks
                    {
                        headers: {
                            Authorization: `Bearer ${token}`, // اصلاح استفاده از backticks
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

    // اسکرول به پایین پیام‌ها
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // انتخاب ایموجی
    const onEmojiClick = (emojiObject) => {
        setNewMessage((prev) => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    // انتخاب فایل
    const handleFileChange = (e) => {
        setSelectedFiles(e.target.files);
    };

    // شروع ضبط ویس
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

    // توقف ضبط ویس
    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            setRecording(false);
            console.log('Chat: Stopped recording');
        }
    };

    // ارسال پیام (متن، فایل، یا ویس)
    const handleSendMessage = async () => {
        if (!id || isNaN(id)) {
            setError('شناسه کاربر نامعتبر است');
            return;
        }
        try {
            const formData = new FormData();
            if (newMessage.trim()) {
                formData.append('content', newMessage);
            }
            if (selectedFiles.length > 0) {
                for (let i = 0; i < selectedFiles.length; i++) {
                    formData.append('files', selectedFiles[i]);
                }
            }
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                formData.append('files', audioBlob, 'voice.webm');
            }
            if (!newMessage.trim() && selectedFiles.length === 0 && audioChunks.length === 0) {
                setError('پیام، فایل یا ویس نمی‌تواند خالی باشد');
                console.log('Chat: Empty message/files/voice');
                return;
            }

            console.log('Chat: Sending message/files/voice');
            const response = await axios.post(
                `http://localhost:8080/message/user/${id}`, // اصلاح استفاده از backticks
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`, // اصلاح استفاده از backticks
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            console.log('Chat: Send response:', response.data);

            // ارسال پیام از طریق WebSocket
            if (socket) {
                socket.emit('send_message', {
                    id: response.data.message_id,
                    content: newMessage || '',
                    sender_id: parseInt(localStorage.getItem('user_id')),
                    receiver_id: parseInt(id),
                });
            }

            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    id: response.data.message_id,
                    content: newMessage || '',
                    sender_id: parseInt(localStorage.getItem('user_id')),
                    receiver_id: parseInt(id),
                    created_at: new Date().toISOString(),
                    seen: false,
                    is_received: false,
                    type: newMessage.trim() ? 'text' : 'file',
                    files: selectedFiles.length > 0 || audioChunks.length > 0
                        ? Array.from(selectedFiles).concat(
                              audioChunks.length > 0 ? [{ name: 'voice.webm' }] : []
                          ).map((file) => ({
                              FilePath: `./Uploads/${file.name}`, // اصلاح استفاده از backticks
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
            ]);

            setNewMessage('');
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
                error.response?.data?.error || `خطا در ارسال پیام: ${error.message}` // اصلاح استفاده از backticks
            );
        }
    };

    return (
        <div className="chat-container">
            <h2>چت با کاربر {id}</h2>
            <p>تست رندر صفحه چت</p>
            {error && <p className="error">{error}</p>}
            <div className="messages">
                {messages.length === 0 ? (
                    <p>هیچ پیامی وجود ندارد</p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message ${
                                msg.sender_id === parseInt(localStorage.getItem('user_id'))
                                    ? 'sent'
                                    : 'received'
                            }`}
                        >
                            {msg.content && <p>{msg.content}</p>}
                            {msg.files && msg.files.length > 0 && msg.files.map((file, index) => (
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
                                        <a href={file.FilePath} download>{file.FilePath.split('/').pop()}</a>
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
                {showEmojiPicker && (
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                )}
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