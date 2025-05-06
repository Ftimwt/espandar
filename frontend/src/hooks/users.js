import {useEffect, useState} from "react";
import {getContacts} from "../api";
import {toast} from "react-toastify";

export const useContacts = () => {
    const [contacts, setContacts] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        getContacts(token).then(setContacts).catch((err) => {
            toast.error(err.data?.error || 'خطایی در ارسال رخ داده است');
        });
    }, []);

    return {contacts};
}