import React, { useState, useEffect, useCallback, memo } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { User, Save } from "lucide-react";
import { motion } from "framer-motion";
import { updateUser } from "../../features/userSlice";

const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const GeneralSettings = memo(({ currentUser }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        full_name: currentUser?.full_name || "",
        username: currentUser?.username || "",
        bio: currentUser?.bio || "",
    });

    // Sync state if currentUser updates externally
    useEffect(() => {
        if (currentUser) {
            setFormData({
                full_name: currentUser.full_name || "",
                username: currentUser.username || "",
                bio: currentUser.bio || "",
            });
        }
    }, [currentUser]);

    const handleSaveGeneral = useCallback(async (e) => {
        e.preventDefault();
        const token = await getToken();
        const data = new FormData();
        data.append("full_name", formData.full_name);
        data.append("username", formData.username);
        data.append("bio", formData.bio);

        toast.promise(
            dispatch(updateUser({ formData: data, token })).unwrap(),
            {
                loading: t("settings.general.saving"),
                success: t("settings.general.success"),
                error: t("settings.general.error"),
            }
        );
    }, [dispatch, formData, getToken, t]);

    return (
        <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-content border-b border-adaptive pb-4">
                <div className="p-2 bg-primary/10 rounded-sg"><User className="text-primary" size={24} /></div>
                {t("settings.general.title")}
            </h2>
            <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted ms-1 uppercase tracking-wider">{t("settings.general.fullName")}</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-main border border-adaptive rounded-xl px-4 py-3 text-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder-muted/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted ms-1 uppercase tracking-wider">{t("settings.general.username")}</label>
                        <div className="relative">
                            <span className="absolute start-4 top-1/2 -translate-y-1/2 text-muted font-bold">@</span>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() })}
                                className="w-full bg-main border border-adaptive rounded-xl ps-8 pe-4 py-3 text-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder-muted/50"
                                placeholder="username"
                                minLength={4}
                                maxLength={20}
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted ms-1 uppercase tracking-wider">{t("settings.general.bio")}</label>
                    <textarea
                        rows="4"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full bg-main border border-adaptive rounded-xl px-4 py-3 text-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all resize-none placeholder-muted/50"
                        placeholder={t("settings.general.bioPlaceholder")}
                    />
                </div>
                <div className="flex justify-end pt-4 border-t border-adaptive">
                    <button type="submit" className="bg-primary hover:opacity-90 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2">
                        <Save size={20} /> {t("settings.general.saveBtn")}
                    </button>
                </div>
            </form>
        </motion.div>
    );
});

GeneralSettings.displayName = "GeneralSettings";

export default GeneralSettings;
