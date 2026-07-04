import React, { memo, useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
    Clock,
    Check,
    CheckCheck
} from "lucide-react";

// --- Local Imports ---
import VoiceMessage from "../VoiceMessage";
import SharedPostCard from "../../feed/SharedPostCard";
import UserAvatar from "../../common/UserDefaultAvatar";
import PollMessage from "../PollMessage";

// --- Subfolder Components ---
import SystemMessage from "./SystemMessage";
import ReactionPicker from "./ReactionPicker";
import MessageActionMenu from "./MessageActionMenu";
import { ReplyPreview, StoryReplyPreview } from "./Previews";
import ReactionPills from "./ReactionPills";

// --- Helper Functions ---
const renderWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) =>
        part.match(urlRegex) ? (
            <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                {part}
            </a>
        ) : part
    );
};

const MessageItem = ({
    msg,
    userId,
    activeReactionId,
    setActiveReactionId,
    handleReaction,
    setReplyTo,
    setViewReactionMessage,
    scrollToMessage,
    highlightedId,
    readStatus,
    t,
    currentLocale,
    onEdit,
    onDelete,
    onVote
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // 1. 🛡️ Handle System Messages
    if (msg.message_type === "system") {
        return <SystemMessage text={msg.text} />;
    }

    const isMe = String(msg.sender?._id || msg.sender) === String(userId);
    const isDeleted = msg.isDeleted;
    const isSending = msg.status === "sending";
    const isPendingOffline = msg.status === "pending";

    // 2. 🧮 Memoized Reactions Calculations
    const groupedReactions = useMemo(() => {
        if (!msg.reactions?.length) return [];
        const map = {};
        msg.reactions.forEach((r) => {
            const emoji = r.emoji;
            map[emoji] = (map[emoji] || 0) + 1;
        });
        return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
    }, [msg.reactions]);

    const hasMeReacted = useCallback((emoji) => {
        if (!msg.reactions) return false;
        return msg.reactions.some(
            (r) =>
                (r.user?._id === userId || r.user === userId) &&
                r.emoji === emoji
        );
    }, [msg.reactions, userId]);

    // --- Interaction Handlers ---

    const handleSelectReaction = useCallback((emoji) => {
        handleReaction(msg._id, emoji);
    }, [msg._id, handleReaction]);

    const handleToggleMenu = useCallback((e) => {
        e.stopPropagation();
        setShowMenu((prev) => !prev);
    }, []);

    const handleReplyClick = useCallback(() => {
        setReplyTo(msg);
        setShowMobileMenu(false);
    }, [msg, setReplyTo]);

    const handleReactTrigger = useCallback(() => {
        setActiveReactionId(msg._id);
        setShowMobileMenu(false);
    }, [msg._id, setActiveReactionId]);

    const handleViewReactions = useCallback(() => {
        setViewReactionMessage(msg);
    }, [msg, setViewReactionMessage]);

    // Bubble interaction (Swipe/Click on Mobile)
    const handleBubbleClick = useCallback((e) => {
        if (isDeleted || isSending || isPendingOffline) return;
        if (window.innerWidth < 768) {
            setShowMobileMenu((prev) => !prev);
            setActiveReactionId(null);
            setShowMenu(false);
        }
    }, [isDeleted, isSending, isPendingOffline, setActiveReactionId]);

    // Render Read Checkmarks
    const renderCheckmarks = () => {
        if (isSending) return <Clock size={12} className="text-muted/60 animate-pulse" />;
        if (isPendingOffline) return <Clock size={12} className="text-yellow-500/80 animate-pulse" />;
        if (readStatus === "read") return <CheckCheck size={14} className="text-primary drop-shadow-[0_0_5px_rgba(var(--color-primary),0.3)]" />;
        return <Check size={14} className="text-muted/60" />;
    };

    return (
        <div className={`flex w-full mb-6 relative group/item select-none ${isMe ? "justify-end" : "justify-start"}`}>
            <div className={`flex items-end gap-2.5 max-w-[85%] md:max-w-[70%] relative ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* User Avatar */}
                {!isMe && (
                    <div className="shrink-0 mb-1">
                        <UserAvatar user={msg.sender} className="w-8 h-8 rounded-full border border-adaptive shadow-sm" />
                    </div>
                )}

                {/* Bubble Container */}
                <div className="relative group/bubble flex flex-col items-stretch">
                    {/* Username header for group messages */}
                    {!isMe && msg.sender?.full_name && (
                        <span className="text-[10px] font-bold text-muted mb-1 ms-2 block text-start">
                            {msg.sender.full_name.split(" ")[0]}
                        </span>
                    )}

                    <motion.div
                        layout
                        onClick={handleBubbleClick}
                        animate={highlightedId === String(msg._id) ? {
                            scale: [1, 1.03, 0.97, 1],
                            boxShadow: ["0px 0px 0px rgba(var(--color-primary), 0)", "0px 0px 20px rgba(var(--color-primary), 0.4)", "0px 0px 20px rgba(var(--color-primary), 0.4)", "0px 0px 0px rgba(var(--color-primary), 0)"]
                        } : {}}
                        transition={{ duration: 0.5 }}
                        className={`
                            relative px-4 py-3 rounded-2xl border transition-all duration-200 select-text
                            ${isDeleted
                                ? "bg-adaptive/20 border-adaptive/40 text-muted/60 italic"
                                : isMe
                                    ? "bg-primary border-primary/20 text-white rounded-br-none shadow-md shadow-primary/10"
                                    : "bg-surface border-adaptive rounded-bl-none shadow-sm"
                            }
                        `}
                    >
                        {/* Reply Preview Link */}
                        <ReplyPreview replyTo={msg.replyTo} isMe={isMe} scrollToMessage={scrollToMessage} />

                        {/* Story Reply Preview */}
                        <StoryReplyPreview storyId={msg.storyId} isMe={isMe} />

                        {/* Message Content Dispatcher */}
                        {isDeleted ? (
                            <span className="text-xs">{t("messages.deletedMessage")}</span>
                        ) : (
                            <>
                                {msg.message_type === "image" && msg.media_url && (
                                    <div className="rounded-xl overflow-hidden mb-1.5 border border-black/10 dark:border-white/10 max-h-72 cursor-zoom-in" onClick={() => window.open(msg.media_url, "_blank")}>
                                        <img src={msg.media_url} alt="media" className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                )}

                                {msg.message_type === "audio" && msg.media_url && (
                                    <VoiceMessage mediaUrl={msg.media_url} isMe={isMe} />
                                )}

                                {msg.message_type === "shared_post" && msg.sharedPostId && (
                                    <div className="mb-2">
                                        <SharedPostCard post={msg.sharedPostId} />
                                    </div>
                                )}

                                {msg.message_type === "poll" && msg.poll && (
                                    <PollMessage message={msg} currentUserId={userId} onVote={onVote} t={t} />
                                )}

                                {msg.text && (
                                    <p className="text-sm font-medium leading-relaxed break-words text-start whitespace-pre-wrap">
                                        {renderWithLinks(msg.text)}
                                    </p>
                                )}
                            </>
                        )}

                        {/* Floating Reactions Pills */}
                        <ReactionPills
                            groupedReactions={groupedReactions}
                            isMe={isMe}
                            hasMeReacted={hasMeReacted}
                            onViewReactionMessage={handleViewReactions}
                            isDeleted={isDeleted}
                        />
                    </motion.div>

                    {/* Metadata (Time & Status Icons) */}
                    <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className="text-[9px] text-muted/80 font-semibold font-mono">
                            {format(new Date(msg.createdAt), "hh:mm a")}
                        </span>
                        {msg.isEdited && !isDeleted && (
                            <span className="text-[9px] text-muted italic font-bold">({t("messages.edited")})</span>
                        )}
                        {isMe && renderCheckmarks()}
                    </div>
                </div>

                {/* Inline Action Hover/Tap Menu */}
                <MessageActionMenu
                    isMe={isMe}
                    isDeleted={isDeleted}
                    isSending={isSending}
                    showMobileMenu={showMobileMenu}
                    onReply={handleReplyClick}
                    onReact={handleReactTrigger}
                    onToggleMenu={handleToggleMenu}
                    showMenu={showMenu}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    msg={msg}
                    t={t}
                />
            </div>

            {/* Reaction picker popover */}
            <AnimatePresence>
                {activeReactionId === msg._id && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveReactionId(null)} />
                        <ReactionPicker isMe={isMe} onSelect={handleSelectReaction} onClose={() => setActiveReactionId(null)} />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(MessageItem);
