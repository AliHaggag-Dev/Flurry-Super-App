import React, {
    useEffect,
    useState,
    useMemo,
    useCallback
} from "react";

// --- Router & Redux ---
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// --- Third Party Libraries ---
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
    Users,
    MessageSquare,
    UserCheck,
    UserPlus,
    Clock
} from "lucide-react";

// --- Local Imports ---
import api from "../../lib/axios";
import { fetchMyConnections } from "../../features/connectionsSlice";
import { fetchUser } from "../../features/userSlice";
import { useSocketContext } from "../../context/SocketContext";
import ConnectionsSkeleton from "../../components/skeletons/ConnectionsSkeleton";

// --- Subfolder Components ---
import ConnectionsHeader from "./ConnectionsHeader";
import ConnectionsTabs from "./ConnectionsTabs";
import ConnectionCard from "./ConnectionCard";
import EmptyState from "./EmptyState";

/**
 * Connections Component
 * ---------------------
 * Manages the user's network: Followers, Following, Connections, 
 * Pending Requests, and Sent Requests.
 */
const Connections = () => {
    // ========================================================
    // 🌍 Global Hooks
    // ========================================================
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { socket } = useSocketContext();
    const { t } = useTranslation();

    // ========================================================
    // 📊 State & Selectors
    // ========================================================
    const [currentTab, setCurrentTab] = useState("Followers");
    const [searchQuery, setSearchQuery] = useState("");

    const { currentUser, status: userStatus } = useSelector((state) => state.user);
    const { connections, pendingRequests, sentRequests, status: connectionsStatus } = useSelector(
        (state) => state.connections
    );

    const isDataLoading =
        userStatus === "loading" ||
        connectionsStatus === "loading" ||
        userStatus === "idle" ||
        connectionsStatus === "idle";

    // ========================================================
    // 🧠 Derived Data (Memoized)
    // ========================================================

    // 1. Incoming Requests
    const connectionRequests = useMemo(
        () => (pendingRequests || []).map((u) => ({ ...u, requestType: "connection" })),
        [pendingRequests]
    );

    const followRequests = useMemo(
        () => (currentUser?.followRequests || []).map((u) => ({ ...u, requestType: "follow" })),
        [currentUser?.followRequests]
    );

    const combinedReceived = useMemo(
        () => [...connectionRequests, ...followRequests],
        [connectionRequests, followRequests]
    );

    // 2. Outgoing Requests
    const mySentRequests = useMemo(
        () => (sentRequests || []).map((u) => ({ ...u, requestType: "connection" })),
        [sentRequests]
    );

    // 3. Tab Configuration
    const tabs = useMemo(
        () => [
            { id: "Followers", label: t("connections.tabs.followers"), data: currentUser?.followers || [], icon: Users },
            { id: "Following", label: t("connections.tabs.following"), data: currentUser?.following || [], icon: UserPlus },
            { id: "Connections", label: t("connections.tabs.friends"), data: connections, icon: MessageSquare },
            { id: "Pending", label: t("connections.tabs.requests"), data: combinedReceived, icon: UserCheck },
            { id: "Sent", label: t("connections.tabs.sent"), data: mySentRequests, icon: Clock },
        ],
        [currentUser, connections, combinedReceived, mySentRequests, t]
    );

    // 4. Filtered Data
    const activeData = useMemo(() => {
        const currentTabData = tabs.find((t) => t.id === currentTab)?.data || [];
        if (!searchQuery) return currentTabData;

        const lowerQuery = searchQuery.toLowerCase();
        return currentTabData.filter(
            (user) =>
                user.full_name?.toLowerCase().includes(lowerQuery) ||
                user.username?.toLowerCase().includes(lowerQuery)
        );
    }, [tabs, currentTab, searchQuery]);

    // ========================================================
    // ⚡ Handlers & Actions
    // ========================================================

    const handleRefresh = useCallback(() => {
        getToken().then((token) => {
            if (token) {
                dispatch(fetchMyConnections(token));
                dispatch(fetchUser(token));
            }
        });
    }, [getToken, dispatch]);

    const handleMarkAsSeen = useCallback(async () => {
        try {
            const token = await getToken();
            await api.put(
                "/notifications/mark-network-read",
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error("Failed to mark network as read", error);
        }
    }, [getToken]);

    // --- Follow Actions ---
    const handleAcceptFollow = useCallback(async (userId) => {
        try {
            const token = await getToken();
            await api.post(`/user/follow-request/accept/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(t("connections.toasts.followAccepted"));
            dispatch(fetchUser(token));
        } catch (error) { toast.error(t("connections.toasts.failed")); }
    }, [getToken, dispatch, t]);

    const handleDeclineFollow = useCallback(async (userId) => {
        try {
            const token = await getToken();
            await api.post(`/user/follow-request/decline/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(t("connections.toasts.followDeclined"));
            dispatch(fetchUser(token));
        } catch (error) { toast.error(t("connections.toasts.failed")); }
    }, [getToken, dispatch, t]);

    const handleUnfollow = useCallback(async (userId) => {
        try {
            const token = await getToken();
            await api.post(`/user/unfollow/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(t("connections.toasts.unfollowed"));
            dispatch(fetchMyConnections(token));
            dispatch(fetchUser(token));
        } catch (error) { toast.error(t("connections.toasts.failed")); }
    }, [getToken, dispatch, t]);

    // --- Connection Actions ---
    const handleAcceptConnection = useCallback(async (userId) => {
        const toastId = toast.loading(t("connections.toasts.accepting"));
        try {
            const token = await getToken();
            const { data } = await api.post(`/connection/accept/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                toast.success(t("connections.toasts.connected"), { id: toastId });
                dispatch(fetchMyConnections(token));
            }
        } catch (error) { toast.error(t("connections.toasts.failed"), { id: toastId }); }
    }, [getToken, dispatch, t]);

    const handleRejectConnection = useCallback(async (userId) => {
        if (!confirm(t("connections.toasts.rejectConfirm"))) return;
        try {
            const token = await getToken();
            await api.post(`/connection/reject/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(t("connections.toasts.requestRemoved"));
            dispatch(fetchMyConnections(token));
        } catch (error) { toast.error(t("connections.toasts.failed")); }
    }, [getToken, dispatch, t]);

    // ========================================================
    // 🔄 Effects
    // ========================================================

    useEffect(() => {
        if (!socket) return;
        const onNotification = (notification) => {
            if (["connection_request", "connection_accept", "follow_request"].includes(notification.type)) {
                handleRefresh();
            }
        };
        socket.on("newNotification", onNotification);
        socket.on("connectionRemoved", handleRefresh);
        return () => {
            socket.off("newNotification", onNotification);
            socket.off("connectionRemoved", handleRefresh);
        };
    }, [socket, handleRefresh]);

    useEffect(() => { handleMarkAsSeen(); }, [handleMarkAsSeen]);
    useEffect(() => { handleRefresh(); }, [handleRefresh]);

    // ========================================================
    // 🎨 Render
    // ========================================================

    return (
        <div className="min-h-dvh flex flex-col bg-main text-content pt-8 pb-20 overflow-x-hidden transition-colors duration-300">
            <div className="flex-1 max-w-6xl w-full mx-auto px-4 flex flex-col">

                {/* --- Header & Search --- */}
                <ConnectionsHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    currentTab={currentTab}
                    t={t}
                />

                {/* --- Tabs --- */}
                <ConnectionsTabs
                    tabs={tabs}
                    currentTab={currentTab}
                    setCurrentTab={setCurrentTab}
                    setSearchQuery={setSearchQuery}
                />

                {/* --- Grid Content --- */}
                <div className="flex-1">
                    {isDataLoading ? (
                        <ConnectionsSkeleton />
                    ) : (
                        <motion.div
                            key={currentTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full items-start"
                        >
                            <AnimatePresence mode="popLayout">
                                {activeData.length === 0 ? (
                                    <EmptyState searchQuery={searchQuery} currentTab={currentTab} t={t} />
                                ) : (
                                    activeData.map((user, index) => (
                                        <ConnectionCard
                                            key={user._id || user.id || `user-${index}`}
                                            user={user}
                                            type={currentTab}
                                            requestType={user.requestType}
                                            onUnfollow={handleUnfollow}
                                            onAccept={handleAcceptConnection}
                                            onReject={handleRejectConnection}
                                            onAcceptFollow={handleAcceptFollow}
                                            onDeclineFollow={handleDeclineFollow}
                                            navigate={navigate}
                                            t={t}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Connections;
