import React, { useState } from 'react';
import { createGroup } from '../api'; // فرض کنید این تابع را در api.js پیاده‌سازی کنید

const CreateGroup = ({ token }) => {
    const [groupName, setGroupName] = useState('');

    const handleCreateGroup = async () => {
        try {
            await createGroup(token, { name: groupName }); // ایجاد گروه با نام
            setGroupName('');
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    return (
        <div>
            <h2>Create Group</h2>
            <input 
                type="text" 
                placeholder="Group Name" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)} 
            />
            <button onClick={handleCreateGroup}>Create Group</button>
        </div>
    );
};

export default CreateGroup;