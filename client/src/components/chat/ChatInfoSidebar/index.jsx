import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

// --- API & Actions ---
import api from "../../../lib/axios";
import { toggleMuteLocal } from "../../../features/userSlice";

// --- Sub-Components ---
import ProfileSection from "./ProfileSection";
import MembersSection from "./MembersSection";
import SharedContentSection from "./SharedContentSection";
import ActionsSection from "./ActionsSection";

const ChatInfoSidebar = ({ isOpen, onClose, data, isGroup, messages }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { t } = useTranslation();

    // --- State ---
    const [activeTab, setActiveTab] = useState("media");
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isChatLocked, setIsChatLocked] = useState(data?.isChatLocked || false);

    // --- Redux State ---
    const { currentUser } = useSelector((state) => state.user);

    const otherUser = useMemo(() => isGroup ? null : data, [isGroup, data]);

    // Update States on Open
    useEffect(() => {
        if (isOpen && otherUser) {
            setIsMuted(currentUser?.mutedUsers?.includes(otherUser._id) || false);
            setIsBlocked(currentUser?.blockedUsers?.includes(otherUser._id) || false);
        } else if (isOpen && isGroup) {
            setIsMuted(currentUser?.mutedGroups?.includes(data?._id) || false);
            setIsChatLocked(data?.isChatLocked || false);
        }
    }, [isOpen, otherUser, isGroup, currentUser, data]);

    // --- Data Processing (Memoized) ---

    // 1. Shared Media
    const sharedMedia = useMemo(() => {
        if (!messages) return [];
        return messages.filter(m =>
            (m.message_type === "image" || m.message_type === "video") && m.media_url && !m.isDeleted
        );
    }, [messages]);

    // 2. Shared Files
    const sharedFiles = useMemo(() => {
        if (!messages) return [];
        return messages.filter(m =>
            m.message_type === "file" && m.media_url && !m.isDeleted
        ).map(m => ({
            file_name: m.file_name || m.media_url.split("/").pop(),
            file_size: m.file_size || "N/A",
            file_url: m.media_url
        }));
    }, [messages]);

    // 3. Shared Links
    const sharedLinks = useMemo(() => {
        if (!messages) return [];
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = [];
        messages.forEach(m => {
            if (m.text && !m.isDeleted) {
                const found = m.text.match(urlRegex);
                if (found) {
                    found.forEach(url => {
                        links.push({
                            link_url: url,
                            link_title: url.replace(/(^\w+:|^)\/\//, '').split('/')[0]
                        });
                    });
                }
            }
        });
        return links;
    }, [messages]);

    // --- Action Handlers (Memoized) ---

    const handleCopyInfo = useCallback(() => {
        const textToCopy = isGroup ? data?.name : otherUser?.full_name;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            toast.success(t("chatInfo.copySuccess"));
        }
    }, [isGroup, data, otherUser, t]);

    const handleMuteToggle = useCallback(async () => {
        if (loading) return;
        const prevMuted = isMuted;
        setIsMuted(!prevMuted);

        try {
            setLoading(true);
            const token = await getToken();
            const endpoint = isGroup
                ? `/group/${prevMuted ? "unmute" : "mute"}/${data._id}`
                : `/user/${prevMuted ? "unmute" : "mute"}/${otherUser._id}`;

            const { data: resData } = await api.post(endpoint, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resData.success) {
                dispatch(toggleMuteLocal({ id: isGroup ? data._id : otherUser._id, isGroup }));
                toast.success(prevMuted ? t("chatInfo.toasts.unmuted") : t("chatInfo.toasts.muted"));
            }
        } catch (error) {
            setIsMuted(prevMuted);
            toast.error(t("chatInfo.toasts.failed"));
        } finally {
            setLoading(false);
        }
    }, [isGroup, data, otherUser, isMuted, loading, getToken, dispatch, t]);

    const handleBlockToggle = useCallback(async () => {
        if (loading || isGroup) return;
        const prevBlocked = isBlocked;
        setIsBlocked(!prevBlocked);

        try {
            setLoading(true);
            const token = await getToken();
            const endpoint = `/connection/${prevBlocked ? "unblock" : "block"}/${otherUser._id}`;
            const { data: resData } = await api.post(endpoint, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resData.success) {
                toast.success(prevBlocked ? t("chatInfo.toasts.unblocked") : t("chatInfo.toasts.blocked"));
                window.location.reload();
            }
        } catch (error) {
            setIsBlocked(prevBlocked);
            toast.error(t("chatInfo.toasts.failed"));
        } finally {
            setLoading(false);
        }
    }, [isGroup, otherUser, isBlocked, loading, getToken, t]);

    const handleToggleLock = useCallback(async () => {
        if (loading || !isGroup) return;
        const prevLocked = isChatLocked;
        setIsChatLocked(!prevLocked);

        try {
            setLoading(true);
            const token = await getToken();
            const { data: resData } = await api.put(`/group/${data._id}/lock`,
                { isLocked: !prevLocked },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (resData.success) {
                toast.success(prevLocked ? t("chatInfo.toasts.chatUnlocked") : t("chatInfo.toasts.chatLocked"));
            }
        } catch (error) {
            setIsChatLocked(prevLocked);
            toast.error(t("chatInfo.toasts.failed"));
        } finally {
            setLoading(false);
        }
    }, [isGroup, data, isChatLocked, loading, getToken, t]);

    const handleKickMember = useCallback(async (targetUserId, targetName) => {
        if (!confirm(t("chatInfo.toasts.kickConfirm", { name: targetName }))) return;

        try {
            setLoading(true);
            const token = await getToken();
            const { data: resData } = await api.post(`/group/kick`,
                { groupId: data._id, targetUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (resData.success) {
                toast.success(t("chatInfo.toasts.kickSuccess", { name: targetName }));
                window.location.reload();
            }
        } catch (error) {
            toast.error(t("chatInfo.toasts.kickFailed"));
        } finally {
            setLoading(false);
        }
    }, [data, getToken, t]);

    const handleLeaveGroup = useCallback(async () => {
        if (!confirm(t("chatInfo.toasts.leaveConfirm"))) return;

        try {
            setLoading(true);
            const token = await getToken();
            const { data: resData } = await api.post(`/group/leave`,
                { groupId: data._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (resData.success) {
                toast.success(t("chatInfo.toasts.leaveSuccess"));
                navigate("/");
            }
        } catch (error) {
            toast.error(t("chatInfo.toasts.leaveFailed"));
        } finally {
            setLoading(false);
        }
    }, [data, getToken, navigate, t]);

    const handleDeleteChatOrGroup = useCallback(async () => {
        const confirmMsg = isGroup ? t("chatInfo.toasts.deleteGroupConfirm") : t("chatInfo.toasts.deleteChatConfirm");
        if (!confirm(confirmMsg)) return;

        try {
            setLoading(true);
            const token = await getToken();
            const endpoint = isGroup ? `/group/${data._id}` : `/message/chat/${otherUser._id}`;
            const { data: resData } = await api.delete(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resData.success) {
                toast.success(isGroup ? t("chatInfo.toasts.groupDeleted") : t("chatInfo.toasts.chatDeleted"));
                navigate("/");
            }
        } catch (error) {
            toast.error(t("chatInfo.toasts.deleteFailed"));
        } finally {
            setLoading(false);
        }
    }, [isGroup, data, otherUser, getToken, navigate, t]);

    const handleNavigateProfile = useCallback((profileId) => {
        navigate(`/profile/${profileId}`);
        onClose();
    }, [navigate, onClose]);

    // --- Renders ---

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
                    />

                    {/* Sidebar container */}
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 end-0 h-full w-full sm:w-[400px] bg-surface border-s border-adaptive shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-adaptive bg-surface sticky top-0 z-10">
                            <h3 className="font-extrabold text-content text-lg">{t("chatInfo.sidebarTitle")}</h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-main text-muted hover:text-content rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrolling Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
                            <ProfileSection
                                isGroup={isGroup}
                                image={isGroup ? data?.group_image : otherUser?.profile_picture}
                                name={isGroup ? data?.name : otherUser?.full_name}
                                subtitle={isGroup ? otherUser?.username : otherUser?.username}
                                bio={isGroup ? data?.description : otherUser?.bio}
                                onCopyInfo={handleCopyInfo}
                            />

                            <MembersSection
                                isGroup={isGroup}
                                members={data?.members}
                                isMembersOpen={isMembersOpen}
                                setIsMembersOpen={setIsMembersOpen}
                                ownerId={data?.owner?._id || data?.owner}
                                currentUserId={currentUser?._id}
                                onKick={handleKickMember}
                                onNavigate={handleNavigateProfile}
                                t={t}
                            />

                            <SharedContentSection
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                sharedMedia={sharedMedia}
                                sharedFiles={sharedFiles}
                                sharedLinks={sharedLinks}
                                t={t}
                            />

                            <ActionsSection
                                isGroup={isGroup}
                                isMuted={isMuted}
                                isBlocked={isBlocked}
                                loading={loading}
                                isOwner={isGroup && (data?.owner?._id === currentUser?._id || data?.owner === currentUser?._id)}
                                isChatLocked={isChatLocked}
                                onMuteToggle={handleMuteToggle}
                                onBlockToggle={handleBlockToggle}
                                onToggleLock={handleToggleLock}
                                onLeave={handleLeaveGroup}
                                onDelete={handleDeleteChatOrGroup}
                                t={t}
                            />
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default memo(ChatInfoSidebar);
