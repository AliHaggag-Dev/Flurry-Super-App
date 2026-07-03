import React, { memo } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const DangerZone = memo(() => {
    const { t } = useTranslation();
    return (
        <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="border border-red-500/20 bg-red-500/5 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 end-0 p-3 opacity-10"><ShieldAlert size={100} className="text-red-500" /></div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-500">{t("settings.danger.title")}</h2>
            <p className="text-muted mb-8 leading-relaxed max-w-lg">{t("settings.danger.desc")}</p>
            <div className="flex justify-start">
                <button onClick={() => toast.error(t("settings.danger.disabledMsg"))} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-900/20 transition hover:scale-105 active:scale-95 flex items-center gap-2">
                    <ShieldAlert size={18} /> {t("settings.danger.deleteBtn")}
                </button>
            </div>
        </motion.div>
    );
});

DangerZone.displayName = "DangerZone";

export default DangerZone;
