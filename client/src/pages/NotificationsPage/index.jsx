import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { isToday, isYesterday } from "date-fns";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";
import {
    Bell,
    CheckCircle2
} from "lucide-react";

// --- Local Imports ---
import api from "../../lib/axios";

// --- Subfolder Components ---
import NotificationItem from "./NotificationItem";
import NotificationTabs from "./NotificationTabs";

const NotificationsPage = () => {
    // --- State & Hooks ---
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);

    const { getToken } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // Memoized TABS with Translation
    const TABS = useMemo(() => [
        { key: "all", label: t("notifications.tabs.all") },
        { key: "like", label: t("notifications.tabs.likes") },
        { key: "comment", label: t("notifications.tabs.comments") },
        { key: "reply", label: t("notifications.tabs.replies") },
        { key: "share", label: t("notifications.tabs.shares") },
        { key: "follow", label: t("notifications.tabs.follows") },
    ], [t]);

    // --- Effects ---

    const fetchNotifications = useCallback(async () => {
        const controller = new AbortController();
        try {
            const token = await getToken();
            const { data } = await api.get("/notifications?filter=interactions", {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            if (error.name !== "CanceledError") {
                console.error("Error fetching notifications:", error);
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
        return () => controller.abort();
    }, [getToken]);

    useEffect(() => {
        setLoading(true);
        fetchNotifications();
    }, [fetchNotifications]);

    // --- Derived State (Memoized) ---

    const filteredNotifications = useMemo(() => {
        if (activeTab === "all") return notifications;
        return notifications.filter((n) => {
            if (activeTab === "follow") {
                return n.type === "follow" || n.type === "connection_accept" || n.type === "follow_accept";
            }
            return n.type === activeTab;
        });
    }, [activeTab, notifications]);

    const groupedNotifications = useMemo(() => {
        const groups = {
            [t("notifications.groups.today")]: [],
            [t("notifications.groups.yesterday")]: [],
            [t("notifications.groups.earlier")]: []
        };
        filteredNotifications.forEach(n => {
            const date = new Date(n.createdAt);
            if (isToday(date)) groups[t("notifications.groups.today")].push(n);
            else if (isYesterday(date)) groups[t("notifications.groups.yesterday")].push(n);
            else groups[t("notifications.groups.earlier")].push(n);
        });
        return groups;
    }, [filteredNotifications, t]);

    const getUnreadCount = useCallback((type) => {
        if (type === 'all') return notifications.filter(n => !n.read).length;
        if (type === 'follow') {
            return notifications.filter(n =>
                (n.type === 'follow' || n.type === 'connection_accept' || n.type === 'follow_accept') && !n.read
            ).length;
        }
        return notifications.filter(n => n.type === type && !n.read).length;
    }, [notifications]);

    const hasUnreadInCurrentTab = useMemo(() =>
        filteredNotifications.some(n => !n.read),
        [filteredNotifications]);

    // --- Handlers ---

    const handleMarkAllAsRead = useCallback(async () => {
        // Optimistic UI Update
        const updatedNotifications = notifications.map(n => {
            if (activeTab === "all") return { ...n, read: true };
            if (activeTab === "follow" && (n.type === "follow" || n.type === "connection_accept" || n.type === "follow_accept")) {
                return { ...n, read: true };
            }
            if (n.type === activeTab) return { ...n, read: true };
            return n;
        });

        setNotifications(updatedNotifications);
        toast.promise(
            (async () => {
                const token = await getToken();
                await api.put(`/notifications/read-all?type=${activeTab}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            })(),
            {
                loading: t("notifications.toasts.markingRead"),
                success: t("notifications.toasts.allRead"),
                error: t("notifications.toasts.failedSync")
            }
        );
    }, [notifications, activeTab, getToken, t]);

    const handleMarkAsRead = useCallback(async (id) => {
        // Optimistic
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        try {
            const token = await getToken();
            await api.put(`/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) { console.error("Failed to mark as read"); }
    }, [getToken]);

    const handleDelete = useCallback(async (id) => {
        // Optimistic
        setNotifications(prev => prev.filter(n => n._id !== id));
        try {
            const token = await getToken();
            await api.delete(`/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(t("notifications.toasts.removed"));
        } catch (error) {
            toast.error(t("notifications.toasts.failedDelete"));
            fetchNotifications(); // Revert on error
        }
    }, [getToken, fetchNotifications, t]);

    const handleNotificationClick = useCallback((notif) => {
        if (!notif.read) handleMarkAsRead(notif._id);

        if (notif.post) navigate(`/post/${notif.post._id}`);
        else if (notif.sender) navigate(`/profile/${notif.sender._id}`);
    }, [handleMarkAsRead, navigate]);

    // --- Render ---

    return (
        <div className="min-h-screen bg-main text-content relative overflow-x-hidden transition-colors duration-300 scrollbar-hide">
            <div className="max-w-4xl mx-auto p-4 pb-20 pt-8">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
                    <div className="text-start">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-content mb-1">{t("notifications.title")}</h1>
                        <p className="text-sm text-muted font-medium">{t("notifications.subtitle")}</p>
                    </div>
                    {hasUnreadInCurrentTab && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-main text-primary rounded-xl border border-adaptive transition-all active:scale-95 text-sm font-bold shadow-sm hover:shadow-md"
                        >
                            <CheckCircle2 size={18} />
                            {t("notifications.markAll")}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <NotificationTabs
                    tabs={TABS}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    getUnreadCount={getUnreadCount}
                />

                {/* List Content */}
                <div className="space-y-8">
                    {loading ? (
                        // Skeleton Loader
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-surface animate-pulse border border-adaptive h-28 shadow-sm" />
                        ))
                    ) : filteredNotifications.length > 0 ? (
                        Object.entries(groupedNotifications).map(([label, items]) => (
                            items.length > 0 && (
                                <div key={label} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xs font-black text-muted mb-4 ps-2 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary/50"></span> {label}
                                    </h3>
                                    <div className="space-y-3">
                                        <AnimatePresence initial={false}>
                                            {items.map((n) => (
                                                <NotificationItem
                                                    key={n._id}
                                                    notification={n}
                                                    onRead={handleMarkAsRead}
                                                    onDelete={handleDelete}
                                                    onClick={handleNotificationClick}
                                                    t={t}
                                                    currentLocale={currentLocale}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )
                        ))
                    ) : (
                        // Empty State
                        <div className="flex flex-col items-center justify-center py-24 text-center opacity-60">
                            <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6 shadow-sm border border-adaptive animate-in zoom-in duration-500">
                                <Bell className="w-10 h-10 text-muted" />
                            </div>
                            <h3 className="text-xl font-bold text-content">{t("notifications.emptyTitle")}</h3>
                            <p className="text-muted text-sm mt-2 max-w-xs mx-auto">{t("notifications.emptyDesc")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
