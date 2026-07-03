import React, { useState, useCallback, memo } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import { updateNotificationSettings } from "../../features/userSlice";
import Toggle from "./Toggle";

const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const NotificationSettings = memo(({ currentUser }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { t } = useTranslation();

    const [notifSettings, setNotifSettings] = useState({
        email: currentUser?.notificationSettings?.email ?? true,
        push: currentUser?.notificationSettings?.push ?? false,
    });

    const handleNotificationUpdate = useCallback(async (key, value) => {
        setNotifSettings((prev) => ({ ...prev, [key]: value })); // Optimistic
        try {
            const token = await getToken();
            await dispatch(updateNotificationSettings({ settings: { [key]: value }, token })).unwrap();
            toast.success(t("settings.notifications.success"));
        } catch (error) {
            setNotifSettings((prev) => ({ ...prev, [key]: !value })); // Revert
            toast.error(t("settings.notifications.error"));
        }
    }, [dispatch, getToken, t]);

    return (
        <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-content border-b border-adaptive pb-4">
                <div className="p-2 bg-primary/10 rounded-sg"><Bell className="text-primary" size={24} /></div>
                {t("settings.notifications.title")}
            </h2>
            <Toggle label={t("settings.notifications.email")} checked={notifSettings.email} onChange={(val) => handleNotificationUpdate("email", val)} />
            <Toggle label={t("settings.notifications.push")} checked={notifSettings.push} onChange={(val) => handleNotificationUpdate("push", val)} />
            <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-3">
                <Bell size={20} className="text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-content">{t("settings.notifications.infoTitle")}</p>
                    <p className="text-xs text-muted leading-relaxed">{t("settings.notifications.infoDesc")}</p>
                </div>
            </div>
        </motion.div>
    );
});

NotificationSettings.displayName = "NotificationSettings";

export default NotificationSettings;
