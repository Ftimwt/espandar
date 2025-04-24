import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

const Chat = ({ receiverId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    const [socket, setSocket] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const token = localStorage.getItem('token');
    const messagesEndRef = useRef(null);

    // اتصال به WebSocket
    useEffect(() => {
        const newSocket = io('http://localhost:8080', {
            query: { Authorization: token },
        });

        newSocket.on('connect', () => {
            console.log('Chat: Connected to WebSocket');
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

        newSocket.on('error', (err) => {
            console.error('Chat: WebSocket error:', err);
            setError('خطا در اتصال به سرور');
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            console.log('Chat: Disconnected from WebSocket');
        };
    }, [token]);

    // بارگذاری پیام‌های اولیه
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                console.log('Chat: Fetching messages for receiver:', receiverId);
                const response = await axios.get(
                    `http://localhost:8080/messages/user/${receiverId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                console.log('Chat: Messages response:', response.data);
                setMessages(response.data);
            } catch (error) {
                console.error('Chat: Error fetching messages:', error);
                setError('خطا در بارگذاری پیام‌ها');
            }
        };

        fetchMessages();
    }, [receiverId, token]);

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
        try {
            const formData = new FormData();

            // افزودن متن (در صورت وجود)
            if (newMessage.trim()) {
                formData.append('content', newMessage);
            }

            // افزودن فایل‌ها (در صورت وجود)
            if (selectedFiles.length > 0) {
                for (let i = 0; i < selectedFiles.length; i++) {
                    formData.append('files', selectedFiles[i]);
                }
            }

            // افزودن ویس (در صورت وجود)
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
                `http://localhost:8080/message/user/${receiverId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            console.log('Chat: Send response:', response.data);

            // اضافه کردن پیام به لیست
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    id: response.data.message_id,
                    content: newMessage || '',
                    sender_id: parseInt(localStorage.getItem('user_id')),
                    receiver_id: parseInt(receiverId),
                    created_at: new Date().toISOString(),
                    seen: false,
                    is_received: false,
                    type: newMessage.trim() ? 'text' : 'file',
                    files: selectedFiles.length > 0 || audioChunks.length > 0
                        ? Array.from(selectedFiles).map((file) => ({
                              FilePath: `./Uploads/${file.name}`,
                              Type: file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name === 'voice.webm'
                                  ? 'voice'
                                  : file.name.endsWith('.mp4') || file.name.endsWith('.webm')
                                  ? 'video'
                                  : file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg')
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
                error.response?.data?.error ||
                ` خطا در ارسال پیام: ${error.message}`
            );
        }
    };

    return (
        <div className="chat-container">
            <h2>چت با کاربر {receiverId}</h2>
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