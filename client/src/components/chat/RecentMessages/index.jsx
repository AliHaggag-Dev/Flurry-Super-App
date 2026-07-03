import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";
import { MessageSquare } from "lucide-react";

// --- API & Context ---
import api from "../../../lib/axios";
import { useSocketContext } from "../../../context/SocketContext";

// --- Components ---
import NewChatModal from "../../modals/NewChatModal";

// --- Sub-Components ---
import ChatItem from "./ChatItem";
import RecentHeader from "./RecentHeader";

const RecentMessages = () => {
    // --- State ---
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

    // --- Hooks ---
    const { getToken } = useAuth();
    const { currentUser } = useSelector((state) => state.user);
    const location = useLocation();
    const { onlineUsers, socket } = useSocketContext();
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // --- Actions ---

    const markChatAsRead = useCallback(async (partnerId) => {
        // Optimistic Update
        setConversations(prev => prev.map(chat => {
            if (chat.partner._id === partnerId) {
                if (chat.unreadCount === 0) return chat; // Avoid unnecessary updates
                return {
                    ...chat,
                    unreadCount: 0,
                    lastMessage: { ...chat.lastMessage, read: true }
                };
            }
            return chat;
        }));

        try {
            const token = await getToken();
            await api.put(`/message/read/${partnerId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    }, [getToken]);

    const fetchConversations = useCallback(async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/message/recent", { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) setConversations(data.conversations);
        } catch (error) {
            console.error("Chat Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    // --- Effects ---

    // 1. Initial Fetch & Polling
    useEffect(() => {
        if (!currentUser) return;
        fetchConversations();

        // Poll every 10s as a fallback for socket issues
        const intervalId = setInterval(fetchConversations, 10000);
        return () => clearInterval(intervalId);
    }, [currentUser, fetchConversations]);

    // 2. Socket: Handle New Messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            setConversations((prevChats) => {
                const partnerId = newMessage.sender._id || newMessage.sender === currentUser._id
                    ? newMessage.receiver._id || newMessage.receiver
                    : newMessage.sender._id || newMessage.sender;

                const existingChatIndex = prevChats.findIndex(chat => chat.partner._id === partnerId);
                let updatedChats = [...prevChats];

                if (existingChatIndex !== -1) {
                    // Update existing chat
                    const chatToMove = { ...updatedChats[existingChatIndex] };
                    chatToMove.lastMessage = newMessage;

                    // Increment unread count if message is not from me
                    const isFromMe = newMessage.sender === currentUser._id || newMessage.sender?._id === currentUser._id;
                    if (!isFromMe) {
                        chatToMove.unreadCount = (chatToMove.unreadCount || 0) + 1;
                    }

                    updatedChats.splice(existingChatIndex, 1);
                    updatedChats.unshift(chatToMove);
                } else {
                    // New chat: Re-fetch to get full partner details
                    fetchConversations();
                }
                return updatedChats;
            });
        };

        socket.on("receiveMessage", handleNewMessage);
        return () => socket.off("receiveMessage", handleNewMessage);
    }, [socket, currentUser, fetchConversations]);

    // 3. Mark as Read on Route Change
    useEffect(() => {
        if (location.pathname.startsWith('/messages/')) {
            const pathParts = location.pathname.split('/');
            const currentChatId = pathParts[pathParts.length - 1];

            if (currentChatId && conversations.length > 0) {
                const targetChat = conversations.find(c => c.partner?._id === currentChatId);
                // Only mark read if there are unread messages
                if (targetChat && targetChat.unreadCount > 0) {
                    markChatAsRead(currentChatId);
                }
            }
        }
    }, [location.pathname, conversations, markChatAsRead]);

    // --- Derived State ---

    const totalUnreadCount = useMemo(() => {
        return conversations.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
    }, [conversations]);

    const filteredConversations = useMemo(() => {
        return conversations.filter(chat =>
            chat.partner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.partner?.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [conversations, searchQuery]);

    const activeChatId = useMemo(() => {
        if (location.pathname.startsWith('/messages/')) {
            const parts = location.pathname.split('/');
            return parts[parts.length - 1];
        }
        return null;
    }, [location.pathname]);

    return (
        <div className="w-full h-full bg-surface border border-adaptive rounded-3xl overflow-hidden shadow-xl flex flex-col min-h-[500px]">
            {/* Header & Search */}
            <RecentHeader
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onNewChatClick={() => setIsNewChatModalOpen(true)}
                totalUnreadCount={totalUnreadCount}
                t={t}
            />

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2 custom-scrollbar bg-surface select-none">
                {loading ? (
                    // Skeletons
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3 px-3 py-4 rounded-2xl bg-main animate-pulse border border-adaptive h-16 shadow-xs" />
                    ))
                ) : filteredConversations.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                        {filteredConversations.map((chat) => {
                            const partnerId = chat.partner?._id;
                            const isOnline = onlineUsers?.includes(partnerId);
                            const isActive = activeChatId === partnerId;

                            return (
                                <ChatItem
                                    key={chat._id || partnerId}
                                    chat={chat}
                                    isActive={isActive}
                                    isOnline={isOnline}
                                    currentUser={currentUser}
                                    t={t}
                                    currentLocale={currentLocale}
                                />
                            );
                        })}
                    </AnimatePresence>
                ) : (
                    // Empty state
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-55">
                        <div className="bg-main p-4 rounded-full mb-3 border border-adaptive shadow-xs">
                            <MessageSquare className="text-muted w-7 h-7" />
                        </div>
                        <p className="text-sm font-bold text-content">{t("messages.noRecentChats")}</p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={isNewChatModalOpen}
                onClose={() => setIsNewChatModalOpen(false)}
            />
        </div>
    );
};

export default memo(RecentMessages);
