import { useEffect } from 'react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const useOfflineSync = () => {
    const { t } = useTranslation();

    const processQueue = async () => {
        const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        if (queue.length === 0) return;
        if (!navigator.onLine) return;

        const toastId = toast.loading(t("chat.toasts.syncing"));
        const newQueue = [];

        for (const msg of queue) {
            try {
                await api.post(msg.endpoint, msg.data);
            } catch (error) {
                console.error("فشل إرسال رسالة من الطابور", error);
                if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
                    newQueue.push(msg);
                } else {
                    newQueue.push(msg);
                }
            }
        }

        // تحديث الطابور
        localStorage.setItem('offlineQueue', JSON.stringify(newQueue));

        if (newQueue.length < queue.length) {
            toast.success(t("chat.toasts.synced"), { id: toastId });

            window.dispatchEvent(new Event("messages-synced"));
        } else {
            toast.dismiss(toastId);
        }
    };

    useEffect(() => {
        const handleOnline = () => {
            console.log("🟢 Back Online! Syncing...");
            processQueue();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    useEffect(() => {
        if (navigator.onLine) {
            processQueue();
        }
    }, []);

    const addToQueue = (endpoint, data) => {
        const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        queue.push({ endpoint, data, timestamp: Date.now() });
        localStorage.setItem('offlineQueue', JSON.stringify(queue));
    };

    return { addToQueue };
};

export default useOfflineSync;