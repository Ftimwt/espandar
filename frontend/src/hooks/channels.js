import { useEffect, useState } from "react";
import { getChannels } from "../api";
import { toast } from "react-toastify";

export const useChannels = () => {
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    getChannels(token).then((res) => {
      setChannels(res.channels);
    }).catch((err) => {
      console.error('useChannels: error during set channels')
      toast.error(err.data?.error || 'خطایی در دریافت لیست چنل ها رخ داده است');
    });
  }, []);

  return { channels };
}