import React, { useMemo, useCallback, memo } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Palette, Moon, Sun, Monitor, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

const ACCENT_OPTIONS = {
    dark: [
        { id: "purple", label: "Amethyst", color: "#9333ea" },
        { id: "green", label: "Emerald", color: "#10b981" },
        { id: "red", label: "Crimson", color: "#f43f5e" },
    ],
    light: [
        { id: "blue", label: "Sky", color: "#2563eb" },
        { id: "green", label: "Leaf", color: "#059669" },
        { id: "orange", label: "Sunset", color: "#f97316" },
    ],
    fantasy: [
        { id: "pink", label: "Neon Rose", color: "#d946ef" },
        { id: "cyan", label: "Cyber Cyan", color: "#22d3ee" },
        { id: "yellow", label: "Royal Gold", color: "#fbbf24" },
    ],
};

const THEME_OPTIONS = [
    { id: "dark", label: "Dark Mode", icon: Moon },
    { id: "light", label: "Light Mode", icon: Sun },
    { id: "fantasy", label: "Fantasy Mode", icon: Monitor },
];

const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

const AppearanceSettings = memo(() => {
    const { theme, setTheme, accent, setAccent } = useTheme();
    const { t } = useTranslation();

    const handleThemeChange = useCallback((newTheme) => {
        setTheme(newTheme);
        const defaultAccents = { dark: "purple", light: "blue", fantasy: "pink" };
        setAccent(defaultAccents[newTheme]);
        toast.success(t("settings.appearance.themeChanged", { theme: newTheme }));
    }, [setTheme, setAccent, t]);

    const handleAccentChange = useCallback((accentId) => {
        setAccent(accentId);
        toast.success(t("settings.appearance.accentChanged"));
    }, [setAccent, t]);

    const currentAccents = useMemo(() => ACCENT_OPTIONS[theme] || [], [theme]);

    return (
        <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="space-y-10">
            <section>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-content">
                    <Palette className="text-primary" size={22} /> {t("settings.appearance.baseTheme")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {THEME_OPTIONS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleThemeChange(item.id)}
                            className={`relative p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all duration-300 group
                ${theme === item.id ? "bg-primary/5 border-primary text-primary shadow-md scale-[1.02]" : "bg-main border-adaptive text-muted hover:border-primary/50 hover:bg-surface"}`}
                        >
                            <item.icon size={32} className={`transition-transform duration-300 group-hover:scale-110 ${theme === item.id ? "text-primary" : "text-muted"}`} />
                            <span className="font-bold">{t(`settings.appearance.themes.${item.id}`)}</span>
                            {theme === item.id && (
                                <div className="absolute top-3 end-3 bg-primary text-white p-1 rounded-full shadow-sm animate-in zoom-in">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <section className="p-6 bg-main rounded-3xl border border-adaptive relative overflow-hidden">
                <div className="absolute top-0 start-0 w-1 bg-primary h-full"></div>
                <p className="text-xs font-bold text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    {t("settings.appearance.accentColor")}
                    <span className="w-10 h-0.5 bg-primary block rounded-full opacity-50"></span>
                </p>
                <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                    {currentAccents.map((option) => (
                        <button key={option.id} onClick={() => handleAccentChange(option.id)} className="group flex flex-col items-center gap-2 transition-transform active:scale-95">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-[3px]
                  ${accent === option.id ? "border-content scale-110 ring-4 ring-opacity-20 ring-offset-2 ring-offset-surface" : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"}`}
                                style={{ backgroundColor: option.color, boxShadow: accent === option.id ? `0 0 15px ${option.color}60` : "none" }}
                            >
                                {accent === option.id && <Check className="text-white drop-shadow-md" size={20} strokeWidth={3} />}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${accent === option.id ? "text-primary" : "text-muted"}`}>{option.label}</span>
                        </button>
                    ))}
                </div>
            </section>
        </motion.div>
    );
});

AppearanceSettings.displayName = "AppearanceSettings";

export default AppearanceSettings;
