import React, { useState, useCallback, memo } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useSocketContext } from "../../context/SocketContext";
import { updatePrivacy } from "../../features/userSlice";
import Toggle from "./Toggle";

const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const PrivacySettings = memo(({ currentUser }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { socket } = useSocketContext();
    const { t } = useTranslation();

    const [privacySettings, setPrivacySettings] = useState({
        isPrivate: currentUser?.isPrivate || false,
        hideOnlineStatus: currentUser?.hideOnlineStatus || false,
    });

    const handlePrivacyUpdate = useCallback(async (key, value) => {
        // Optimistic Update
        setPrivacySettings((prev) => ({ ...prev, [key]: value }));
        try {
            const token = await getToken();
            await dispatch(updatePrivacy({ settings: { [key]: value }, token })).unwrap();
            if (key === "hideOnlineStatus" && socket) {
                socket.emit("toggleOnlineStatus", { isHidden: value });
            }
            toast.success(t("settings.privacy.success"));
        } catch (error) {
            setPrivacySettings((prev) => ({ ...prev, [key]: !value })); // Revert
            toast.error(t("settings.privacy.error"));
        }
    }, [dispatch, getToken, socket, t]);

    return (
        <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-content border-b border-adaptive pb-4">
                <div className="p-2 bg-primary/10 rounded-sg"><Lock className="text-primary" size={24} /></div>
                {t("settings.privacy.title")}
            </h2>
            <Toggle label={t("settings.privacy.privateProfile")} checked={privacySettings.isPrivate} onChange={(val) => handlePrivacyUpdate("isPrivate", val)} />
            <Toggle label={t("settings.privacy.hideStatus")} checked={privacySettings.hideOnlineStatus} onChange={(val) => handlePrivacyUpdate("hideOnlineStatus", val)} />
        </motion.div>
    );
});

PrivacySettings.displayName = "PrivacySettings";

export default PrivacySettings;
