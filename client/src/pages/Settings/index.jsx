import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

// Icons
import {
    User, Lock, Palette, Bell, ShieldAlert,
    ChevronDown, Check, Earth
} from "lucide-react";

// Sub-Components
import TabButton from "./TabButton";
import GeneralSettings from "./GeneralSettings";
import PrivacySettings from "./PrivacySettings";
import AppearanceSettings from "./AppearanceSettings";
import NotificationSettings from "./NotificationSettings";
import LanguageSettings from "./LanguageSettings";
import DangerZone from "./DangerZone";

/**
 * Settings Component
 * ------------------------------------------------------------------
 * Purpose: Manages user preferences (Profile, Privacy, Theme, Notifications).
 */
const Settings = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [activeTab, setActiveTab] = useState("general");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { t } = useTranslation();

    const TABS = useMemo(() => [
        { id: "general", label: t("settings.tabs.general"), icon: <User className="w-4 h-4" /> },
        { id: "privacy", label: t("settings.tabs.privacy"), icon: <Lock className="w-4 h-4" /> },
        { id: "appearance", label: t("settings.tabs.appearance"), icon: <Palette className="w-4 h-4" /> },
        { id: "notifications", label: t("settings.tabs.notifications"), icon: <Bell className="w-4 h-4" /> },
        { id: "language", label: t("settings.tabs.language"), icon: <Earth className="w-4 h-4" /> },
        { id: "danger", label: t("settings.tabs.danger"), icon: <ShieldAlert className="w-4 h-4" /> },
    ], [t]);

    return (
        <div className="min-h-screen bg-main text-content p-4 md:p-8 overflow-x-hidden transition-colors duration-300">
            <div className="max-w-4xl mx-auto mt-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-start mb-8 md:mb-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-content flex items-center gap-3">{t("settings.header.title")}</h1>
                    <p className="text-muted text-sm md:text-base mt-2 font-medium">{t("settings.header.subtitle")}</p>
                </motion.div>

                {/* Tabs Navigation */}
                <div className="relative mb-10">
                    {/* Mobile Menu */}
                    <div className="sm:hidden relative">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-full flex items-center justify-between bg-surface border border-adaptive rounded-xl px-4 py-3 text-content font-bold shadow-sm transition-all active:scale-[0.99]"
                        >
                            <span className="flex items-center gap-2">
                                {TABS.find(t => t.id === activeTab)?.icon}
                                {TABS.find(t => t.id === activeTab)?.label}
                            </span>
                            <ChevronDown size={18} className={`transition-transform duration-300 ${isMobileMenuOpen ? "rotate-180 text-primary" : "text-muted"}`} />
                        </button>
                        <AnimatePresence>
                            {isMobileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsMobileMenuOpen(false)} />
                                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }} className="absolute top-full mt-2 left-0 right-0 bg-surface border border-adaptive rounded-xl shadow-xl z-50 overflow-hidden">
                                        {TABS.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-primary/10 text-primary border-s-4 border-primary" : "text-muted hover:bg-main hover:text-content"}`}
                                            >
                                                {tab.icon} {tab.label}
                                                {activeTab === tab.id && <Check size={16} className="ms-auto" />}
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Desktop Tabs */}
                    <div className="hidden sm:flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:justify-start gap-3 scrollbar-hide scroll-smooth">
                        {TABS.map((tab) => (
                            <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
                        ))}
                    </div>
                    <div className="hidden sm:block absolute bottom-0 start-0 end-0 h-[1px] bg-adaptive -z-10" />
                </div>

                {/* Content Area */}
                <div className="bg-surface border border-adaptive rounded-3xl p-6 md:p-10 shadow-xl min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "general" && <GeneralSettings key="general" currentUser={currentUser} />}
                        {activeTab === "privacy" && <PrivacySettings key="privacy" currentUser={currentUser} />}
                        {activeTab === "appearance" && <AppearanceSettings key="appearance" />}
                        {activeTab === "notifications" && <NotificationSettings key="notifications" currentUser={currentUser} />}
                        {activeTab === "language" && <LanguageSettings key="language" />}
                        {activeTab === "danger" && <DangerZone key="danger" />}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Settings;
