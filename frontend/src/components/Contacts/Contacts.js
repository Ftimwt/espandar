import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {getContacts} from '../../api';
import {Box, Button, List, ListItem, ListItemText, TextField, Typography} from '@mui/material';
import CreateChannel from "../Channels/create";

const Contacts = ({token, isAdmin, onLogout}) => {
    const [contacts, setContacts] = useState([]);
    const [showContacts, setShowContacts] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newContact, setNewContact] = useState({name: '', phone: ''});
    const [groupData, setGroupData] = useState({name: '', userIds: []});
    const navigate = useNavigate();

    console.log('Contacts: Rendering, isAdmin:', isAdmin, 'token:', token);

    const validatePhone = (phone) => {
        const regex = /^09[0-9]{9}$/;
        return regex.test(phone) && phone.length === 11;
    };

    const fetchContacts = useCallback(async () => {
        try {
            if (!token) throw new Error('No token provided');
            console.log('Contacts: Fetching contacts with token:', token);
            const response = await getContacts(token);
            console.log('Contacts: Response:', response);
            // بررسی پاسخ سرور
            const validContacts = Array.isArray(response)
                ? response.filter(contact => {
                    const id = isAdmin ? contact.target_id : contact.user_id;
                    return id && !isNaN(id) && id.toString().trim() !== '';
                })
                : [];
            setContacts(validContacts);
            if (response.length !== validContacts.length) {
                console.warn('Contacts: Some contacts were filtered out due to invalid IDs');
            }
        } catch (error) {
            console.error('Contacts: Error fetching contacts:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            setContacts([]);
        }
    }, [token, isAdmin]);

    useEffect(() => {
        if (showContacts) {
            fetchContacts();
        }
    }, [fetchContacts, showContacts]);

    const handleAddContact = async () => {
        if (!newContact.name || !newContact.phone) {
            console.error('Contacts: Name and phone are required');
            alert('نام و شماره تلفن الزامی است');
            return;
        }
        if (!validatePhone(newContact.phone)) {
            console.error('Contacts: Invalid phone number:', newContact.phone);
            alert('شماره تلفن باید ۱۱ رقم باشد و با 09 شروع شود');
            return;
        }
        try {
            console.log('Contacts: Adding contact with token:', token);
            const response = await axios.post('http://localhost:8080/admin/contacts', newContact, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log('Contacts: Add contact response:', response.data);
            setNewContact({name: '', phone: ''});
            setShowAddContact(false);
            fetchContacts();
        } catch (error) {
            console.error('Contacts: Error adding contact:', {
                message: error.message,
                response: error.response?.data, // اینجا می‌توانید جزئیات بیشتری از خطا ببینید
                status: error.response?.status,
            });
            alert('خطا در افزودن مخاطب: ' + (error.response?.data?.error || 'مشکل ناشناخته'));
        }
    };

    const handleCreateGroup = async () => {
        try {
            const response = await axios.post('http://localhost:8080/groups/with-members', groupData, {
                headers: {Authorization: `Bearer ${token}`},
            });
            console.log('Contacts: Create group response:', response.data);
            setGroupData({name: '', userIds: []});
            setShowCreateGroup(false);
        } catch (error) {
            console.error('Contacts: Error creating group:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            alert('خطا در ایجاد گروه: ' + (error.response?.data?.error || 'مشکل ناشناخته'));
        }
    };

    const toggleContacts = () => {
        console.log('Contacts: Toggling contacts, current showContacts:', showContacts);
        setShowContacts(!showContacts);
        if (!showContacts) setShowAddContact(false);
    };

    const handleContactClick = (event, targetId) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!targetId || isNaN(targetId) || targetId.toString().trim() === '') {
            console.error('Contacts: Invalid targetId:', targetId);
            alert('شناسه مخاطب نامعتبر است');
            return;
        }
        console.log('Contacts: Navigating to chat for user:', targetId);
        navigate(`/chat/user/${targetId}`);
    };

    return (
        <Box sx={{p: 3, maxWidth: 600, mx: 'auto'}}>
            <CreateChannel open={showCreateChannel} onClose={() => setShowCreateChannel(false)}/>
            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                <Typography variant="h4">مخاطبین</Typography>
                <Button variant="outlined" color="secondary" onClick={onLogout}>
                    خروج
                </Button>
            </Box>
            <Button variant="contained" onClick={toggleContacts} sx={{mb: 2}}>
                {showContacts ? 'مخفی کردن' : 'نمایش مخاطبین'}
            </Button>

            {isAdmin ? (
                <Box>
                    {showContacts && (
                        <Box sx={{mt: 2}}>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    console.log('Contacts: New Contact button clicked');
                                    setShowAddContact(true);
                                }}
                                sx={{mb: 2, mr: 1}}
                            >
                                مخاطب جدید
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => setShowCreateGroup(true)}
                                sx={{mb: 2, mr: 1}}
                            >
                                ایجاد گروه
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => setShowCreateChannel(true)}
                                sx={{mb: 2}}
                            >
                                ایجاد کانال
                            </Button>
                            {showAddContact && (
                                <Box component="form"
                                     onSubmit={(e) => {
                                         e.preventDefault();
                                         handleAddContact();
                                     }} sx={{mb: 2}}>
                                    <Typography variant="h6">افزودن مخاطب</Typography>
                                    <TextField
                                        label="نام"
                                        value={newContact.name}
                                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                                        fullWidth
                                        margin="normal"
                                    />
                                    <TextField
                                        label="شماره تلفن (09123456789)"
                                        value={newContact.phone}
                                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                                        fullWidth
                                        margin="normal"
                                    />
                                    <Button type="submit" variant="contained" sx={{mr: 1}}>
                                        اضافه کردن
                                    </Button>
                                    <Button variant="outlined" onClick={() => setShowAddContact(false)}>
                                        لغو
                                    </Button>
                                </Box>
                            )}
                            {showCreateGroup && (
                                <Box sx={{mb: 2}}>
                                    <Typography variant="h6">ایجاد گروه</Typography>
                                    <TextField
                                        label="نام گروه"
                                        value={groupData.name}
                                        onChange={(e) =>
                                            setGroupData({...groupData, name: e.target.value})
                                        }
                                        fullWidth
                                        margin="normal"/>
                                    <TextField
                                        label="شناسه‌های کاربران (با کاما جدا کنید)"
                                        value={groupData.userIds.join(',')}
                                        onChange={(e) =>
                                            setGroupData({
                                                ...groupData,
                                                userIds: e.target.value
                                                    .split(',')
                                                    .map(Number)
                                                    .filter((id) => id),
                                            })
                                        }
                                        fullWidth
                                        margin="normal"
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleCreateGroup}
                                        sx={{mr: 1}}
                                    >
                                        ایجاد
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setShowCreateGroup(false)}
                                    >
                                        لغو
                                    </Button>
                                </Box>
                            )}
                            {Array.isArray(contacts) && contacts.length > 0 ? (
                                <List>
                                    {contacts.map((contact, index) => (
                                        <ListItem
                                            key={contact.id || `contact-${index}`}
                                            onClick={(e) => handleContactClick(e, contact.target_id)}
                                            sx={{cursor: 'pointer'}}
                                        >
                                            <ListItemText primary={contact.name} secondary={contact.phone}/>
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography>هیچ مخاطبی وجود ندارد.</Typography>
                            )}
                        </Box>
                    )}
                </Box>
            ) : (
                <Box>{Array.isArray(contacts) && contacts.length > 0 ? (
                    <List>
                        {contacts.map((contact, index) => (
                            <ListItem
                                key={contact.id || `contact-${index}`}
                                onClick={(e) => handleContactClick(e, contact.user_id)} // استفاده از user_id
                                sx={{cursor: 'pointer'}}
                            >
                                <ListItemText
                                    primary={contact.name}
                                    secondary={contact.phone}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography>هیچ مخاطبی وجود ندارد.</Typography>
                )}
                    <Button
                        variant="contained"
                        onClick={() => setShowCreateGroup(true)}
                        sx={{mt: 2, mr: 1}}
                    >
                        ایجاد گروه
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setShowCreateChannel(true)}
                        sx={{mt: 2}}
                    >
                        ایجاد کانال
                    </Button>
                    {showCreateGroup && (
                        <Box sx={{mt: 2}}>
                            <Typography variant="h6">ایجاد گروه</Typography>
                            <TextField
                                label="نام گروه"
                                value={groupData.name}
                                onChange={(e) =>
                                    setGroupData({...groupData, name: e.target.value})
                                }
                                fullWidth
                                margin="normal"
                            />
                            <TextField
                                label="شناسه‌های کاربران (با کاما جدا کنید)"
                                value={groupData.userIds.join(',')}
                                onChange={(e) =>
                                    setGroupData({
                                        ...groupData,
                                        userIds: e.target.value
                                            .split(',')
                                            .map(Number)
                                            .filter((id) => id),
                                    })
                                }
                                fullWidth
                                margin="normal"
                            />
                            <Button
                                variant="contained"
                                onClick={handleCreateGroup}
                                sx={{mr: 1}}
                            >
                                ایجاد
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => setShowCreateGroup(false)}
                            >
                                لغو
                            </Button>
                        </Box>
                    )}
                    <Typography sx={{mt: 2}}>
                        شما فقط می‌توانید لیست مخاطبین را مشاهده کنید.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default Contacts;