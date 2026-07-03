import React, { memo } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "framer-motion";
import { Ban } from "lucide-react";
import UserAvatar from "../../common/UserDefaultAvatar";

export const ChatItem = memo(({ chat, isActive, isOnline, currentUser, t, currentLocale }) => {
    const otherUser = chat.partner;
    const lastMsg = chat.lastMessage;
    const isMe = lastMsg?.sender === currentUser?._id || lastMsg?.sender?._id === currentUser?._id;
    const unreadCount = chat.unreadCount || 0;
    const isUnread = unreadCount > 0;

    const isBlockedByMe = chat.isBlockedByMe;
    const isBlockedByPartner = chat.isBlockedByPartner;
    const isConnectionSevered = isBlockedByMe || isBlockedByPartner;

    // Determine preview text
    const getPreviewText = () => {
        if (isBlockedByMe) return <span className="text-red-400 italic flex items-center gap-1"><Ban size={10} /> {t("messages.blockedByMe")}</span>;
        if (isBlockedByPartner) return <span className="text-muted italic flex items-center gap-1">{t("messages.userUnavailable")}</span>;

        return (
            <>
                {isMe && <span className="text-xs opacity-70 font-normal">{t("messages.you")}: </span>}
                {lastMsg?.message_type === "image" ? t("messages.photo") :
                    lastMsg?.message_type === "audio" ? t("messages.voice") :
                        lastMsg?.message_type === "story_reply" ? t("messages.storyReply") :
                            lastMsg?.message_type === "shared_post" ? t("messages.sharedPost") :
                                lastMsg?.text || t("messages.noMessages")}
            </>
        );
    };

    return (
        <Link to={`/messages/${otherUser?._id}`} className="block">
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-all duration-200 group border cursor-pointer
                    ${isActive
                        ? "bg-primary/10 border-primary/20 shadow-inner"
                        : isUnread
                            ? "bg-main border-s-4 border-s-primary shadow-sm"
                            : "border-transparent hover:bg-main hover:border-black/5 dark:hover:border-white/5"
                    }`}
            >
                {/* Avatar Section */}
                <div className="relative shrink-0">
                    <UserAvatar
                        user={otherUser}
                        className={`w-11 h-11 rounded-full border-2 transition-all object-cover
                            ${isActive || isUnread ? "border-primary" : "border-surface group-hover:border-primary/30"}
                            ${isConnectionSevered ? "grayscale opacity-70" : ""} 
                        `}
                    />
                    {isOnline && !isConnectionSevered && (
                        <span className="absolute bottom-1.5 end-0 z-10 w-3 h-3 bg-green-500 border-2 border-surface rounded-full shadow-sm"></span>
                    )}
                    {isBlockedByMe && (
                        <span className="absolute bottom-0 end-0 z-10 p-0.5 bg-surface rounded-full border border-adaptive">
                            <Ban size={12} className="text-red-500" />
                        </span>
                    )}
                </div>

                {/* Chat Details */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`truncate text-sm transition-colors ${isActive || isUnread ? "text-content font-bold" : "text-content/80 font-semibold group-hover:text-content"}`}>
                            {otherUser?.full_name || t("stories.defaultUser")}
                        </span>
                        <span className={`text-[10px] ${isActive || isUnread ? "text-primary font-bold" : "text-muted group-hover:text-muted/80"}`}>
                            {lastMsg?.createdAt ? formatDistanceToNowStrict(new Date(lastMsg.createdAt), { locale: currentLocale }) : ""}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <p className={`text-xs truncate max-w-[140px] flex items-center gap-1.5 ${isActive ? "text-primary/80" : isUnread ? "text-content font-medium" : "text-muted group-hover:text-muted/80"}`}>
                            {getPreviewText()}
                        </p>
                        {unreadCount > 0 && !isConnectionSevered && (
                            <div className="w-5 h-5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full shadow-lg shadow-primary/40 animate-pulse ms-2 font-bold">
                                {unreadCount}
                            </div>
                        )}
                    </div>
                </div>

                {isActive && (
                    <div className="absolute start-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-e-full shadow-[0_0_10px_var(--color-primary)]"></div>
                )}
            </motion.div>
        </Link>
    );
});

ChatItem.displayName = "ChatItem";

export default ChatItem;
