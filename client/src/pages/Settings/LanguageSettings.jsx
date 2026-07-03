import React, { memo } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Earth, Check } from "lucide-react";
import { motion } from "framer-motion";

const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const LanguageSettings = memo(() => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
        toast.success(lang === 'ar' ? 'تم تغيير اللغة للعربية' : 'Switched to English');
    };

    return (
        <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-content border-b border-adaptive pb-4">
                <div className="p-2 bg-primary/10 rounded-sg"><Earth className="text-primary" size={24} /></div>
                {t("settings.language.title")}
            </h2>
            <div className="grid gap-4">
                <button onClick={() => changeLanguage('en')} className={`p-4 rounded-xl border text-start flex items-center justify-between transition-all ${i18n.language === 'en' ? 'border-primary bg-primary/5' : 'border-adaptive hover:bg-surface'}`}>
                    <span className="font-bold">🇺🇸 English</span>
                    {i18n.language === 'en' && <Check className="text-primary" />}
                </button>
                <button onClick={() => changeLanguage('ar')} className={`p-4 rounded-xl border text-start flex items-center justify-between transition-all ${i18n.language === 'ar' ? 'border-primary bg-primary/5' : 'border-adaptive hover:bg-surface'}`}>
                    <span className="font-bold">🇪🇬 العربية</span>
                    {i18n.language === 'ar' && <Check className="text-primary" />}
                </button>
            </div>
        </motion.div>
    );
});

LanguageSettings.displayName = "LanguageSettings";

export default LanguageSettings;
