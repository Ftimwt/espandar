import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getContacts } from '../../api';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Avatar,
  ListItemAvatar,
  ListItemIcon, 
  IconButton 
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CircleIcon from '@mui/icons-material/Circle';
import { API_URL } from '../../constants/config';
import ConferencePanel from '../Conference/ConferencePanel';


const Contacts = ({ token, isAdmin, onLogout }) => {
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [showProfileUploader, setShowProfileUploader] = useState(false);
  const navigate = useNavigate();

  const validatePhone = (phone) => /^09[0-9]{9}$/.test(phone);

  const fetchContacts = useCallback(async () => {
    try {
      if (!token) throw new Error('No token provided');
      const response = await getContacts(token);
      const validContacts = Array.isArray(response)
        ? response.filter((contact) => {
            const id = contact.user_id;
            return id && !isNaN(id) && id.toString().trim() !== '';
          })
        : [];
      setContacts(validContacts);
    } catch (error) {
      console.error('Contacts: Error fetching contacts:', error);
      setContacts([]);
    }
  }, [token]);
  const fetchCurrentUserProfile = async () => {
  try {
    const userId = localStorage.getItem('userId');
    const res = await axios.get(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCurrentUserProfile(res.data);
  } catch (err) {
    console.error('Error fetching profile:', err);
  }
};

  useEffect(() => {
    fetchContacts();
    fetchCurrentUserProfile();
  }, [fetchContacts]);

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone)
      return alert('نام و شماره تلفن الزامی است');
    if (!validatePhone(newContact.phone))
      return alert('شماره تلفن باید با 09 شروع شده و ۱۱ رقم باشد');
    try {
      await axios.post('http://localhost:8080/admin/contacts', newContact, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNewContact({ name: '', phone: '' });
      setShowAddContact(false);
      fetchContacts();
    } catch (error) {
      alert(
        'خطا در افزودن مخاطب: ' +
          (error.response?.data?.error || 'مشکل ناشناخته')
      );
    }
  };

  const handleContactClick = (e, targetId) => {
    e.preventDefault();
    if (!targetId || isNaN(targetId))
      return alert('شناسه مخاطب نامعتبر است');
    navigate(`/chat/user/${targetId}`);
  };

  const handleProfileImageUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await axios.post(`${API_URL}/profile/image`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    alert('تصویر پروفایل به‌روزرسانی شد');
    fetchCurrentUserProfile();
    fetchContacts();
  } catch (err) {
    console.error('Upload error:', err);
    alert('خطا در آپلود تصویر');
  }
};

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">مخاطبین</Typography>
        <Button variant="outlined" color="secondary" onClick={onLogout}>
          خروج
        </Button>
      </Box>

      {/* دکمه‌های عمومی برای همه کاربران */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => navigate('/groups/manage')}
          sx={{ mr: 1 }}
        >
          ایجاد گروه
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/channels/manage')}
        >
          ایجاد کانال
        </Button>
        <Button
  variant="contained"
  onClick={() => setShowProfileUploader((prev) => !prev)}
  sx={{ ml: 1 }}
>
  {showProfileUploader ? 'مخفی کردن پروفایل' : 'تغییر پروفایل'}
</Button>
      </Box>
      <ConferencePanel token={token} contacts={contacts} />
      {showProfileUploader && currentUserProfile && (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
    <Avatar
      alt="پروفایل من"
      src={`${API_URL}${currentUserProfile.profile_image || '/Uploads/profile/default.png'}`}
      sx={{ width: 64, height: 64 }}
    />
    <IconButton component="label">
      <PhotoCameraIcon />
      <input hidden accept="image/*" type="file" onChange={handleProfileImageUpload} />
    </IconButton>
    <Typography>عکس پروفایل</Typography>
  </Box>
)}
      {/* فقط برای admin: دکمه مخاطبین و افزودن مخاطب */}
      {isAdmin && (
        <>
          <Button
            variant="contained"
            onClick={() => setShowContacts((prev) => !prev)}
            sx={{ mb: 2 }}
          >
            {showContacts ? 'مخفی کردن مخاطبین' : 'نمایش مخاطبین'}
          </Button>

          {showContacts && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => setShowAddContact(true)}
                sx={{ mb: 2 }}
              >
                مخاطب جدید
              </Button>

              {showAddContact && (
                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddContact();
                  }}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">افزودن مخاطب</Typography>
                  <TextField
                    label="نام"
                    value={newContact.name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, name: e.target.value })
                    }
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="شماره تلفن (09123456789)"
                    value={newContact.phone}
                    onChange={(e) =>
                      setNewContact({ ...newContact, phone: e.target.value })
                    }
                    fullWidth
                    margin="normal"
                  />
                  <Button type="submit" variant="contained" sx={{ mr: 1 }}>
                    اضافه کردن
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setShowAddContact(false)}
                  >
                    لغو
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {/* لیست مخاطبین برای همه کاربران با شرط نمایش در admin */}
      {(isAdmin ? showContacts : true) && (
        contacts.length > 0 ? (
          <List>
  {contacts.map((contact, index) => (
    <ListItem
      key={contact.id || `contact-${index}`}
      onClick={(e) => handleContactClick(e, contact.TargetID || contact.target_id)}
      sx={{ cursor: 'pointer', alignItems: 'center' }}
    >
      <ListItemAvatar>
        <Avatar
          alt={contact.name}
          src={`${API_URL}${contact.profile_image || '/Uploads/profile/default.png'}`}
        />
      </ListItemAvatar>

      <ListItemText
        primary={contact.name || 'Unknown'}
        secondary={contact.phone || 'No phone'}
      />

      <ListItemIcon>
        <CircleIcon
          fontSize="small"
          sx={{ color: contact.is_online ? 'green' : 'red', ml: 1 }}
        />
      </ListItemIcon>
    </ListItem>
  ))}
</List>
        ) : (
          <Typography sx={{ mt: 2 }}>هیچ مخاطبی وجود ندارد.</Typography>
        )
      )}
    </Box>
  );
};

export default Contacts;
