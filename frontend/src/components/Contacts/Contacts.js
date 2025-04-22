import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { getContacts } from '../../api';

const Contacts = ({ token, isAdmin }) => {
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });

  const fetchContacts = useCallback(async () => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }
      console.log('Fetching contacts with token:', token);
      const response = await getContacts(token);
      // لاگ‌گذاری پاسخ سرور برای بررسی
      console.log('Contacts response:', response);
      setContacts(response);
    } catch (error) {
      console.error('Error fetching contacts:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      console.error('Name and phone are required');
      return;
    }

    try {
      console.log('Adding contact with token:', token);
      const response = await axios.post('http://localhost:8080/admin/contacts', newContact, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Add contact response:', response.data); // لاگ‌گذاری
      setNewContact({ name: '', phone: '' });
      fetchContacts();
      setShowAddContact(false);
    } catch (error) {
      console.error('Error adding contact:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  };

  return (
    <div>
      <h2>Contacts</h2>
      <ul>
        {contacts.map((contact, index) => (
          <li key={contact.id || `contact-${index}`}>
            {contact.name} - {contact.phone}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <div>
          <button onClick={() => setShowAddContact(true)}>+</button>
          {showAddContact && (
            <div>
              <h3>افزودن مخاطب</h3>
              <input
                placeholder="نام"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
              <input
                placeholder="شماره"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
              <button onClick={handleAddContact}>اضافه کردن</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Contacts;