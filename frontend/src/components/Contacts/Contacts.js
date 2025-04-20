import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const Contacts = ({ token, isAdmin }) => {
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });

  const fetchContacts = useCallback(async () => {
    try {
      const response = await axios.get('/api/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = async () => {
    try {
      await axios.post('http://localhost:8080/api/contacts', newContact, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewContact({ name: '', phone: '' });
      fetchContacts();
      setShowAddContact(false);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  return (
    <div>
      <h2>Contacts</h2>
      <ul>
        {contacts.map((contact) => (
          <li key={contact.id}>{contact.name} - {contact.phone}</li>
        ))}
      </ul>
      {isAdmin && (
        <div>
          <button onClick={() => setShowAddContact(true)}>اضافه کردن مخاطب</button>
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