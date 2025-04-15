import React, { useEffect, useState } from 'react';
import { getProfile } from '../api';

const Profile = ({ token }) => {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const result = await getProfile(token);
            setProfile(result);
        };
        fetchProfile();
    }, [token]);

    return (
        <div>
            {profile ? (
                <div>
                    <h1>{profile.username}</h1>
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default Profile;