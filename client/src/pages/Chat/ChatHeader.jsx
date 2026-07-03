import React, { memo } from 'react';
import { ArrowLeft, Video, Phone, MoreVertical } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import UserAvatar from "../../components/common/UserDefaultAvatar";

const ChatHeader = memo(({ targetUser, isChatDisabled, isOnline, currentUser, onBack, onProfile, onCall, onInfo, t, locale }) => {
    const getStatusContent = () => {
        if (isChatDisabled) return <span className="text-muted text-xs">{t("chat.status.unavailable")}</span>;
        if (targetUser?.hideOnlineStatus) return null;
        if (isOnline) return <span className="flex items-center gap-1.5 text-green-500 text-xs font-bold animate-pulse">{t("chat.status.online")}</span>;
        const lastSeenText = targetUser?.lastSeen ? `${t("chat.status.lastSeen")} ${formatDistanceToNowStrict(new Date(targetUser.lastSeen), { addSuffix: true, locale })}` : t("chat.status.offline");
        return <span className="text-muted text-xs">{lastSeenText}</span>;
    };

    return (
        <div className="absolute top-0 start-0 end-0 h-20 bg-surface/80 backdrop-blur-lg flex items-center justify-between px-4 z-20 border-b border-adaptive shadow-sm transition-all">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onProfile}>
                <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 hover:bg-main rounded-full transition text-muted hover:text-primary rtl:scale-x-[-1]">
                    <ArrowLeft size={22} />
                </button>
                <div className="relative">
                    <UserAvatar user={targetUser} className="w-11 h-11 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all" />
                    {!isChatDisabled && isOnline && <span className="absolute bottom-1.5 end-0 z-10 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></span>}
                </div>
                <div>
                    <h3 className="font-bold text-content text-lg leading-tight">{targetUser.full_name}</h3>
                    {getStatusContent()}
                </div>
            </div>

            <div className="flex items-center gap-1">
                <button onClick={() => onCall(true)} disabled={isChatDisabled || !targetUser} className={`p-2 rounded-full transition ${isChatDisabled || !targetUser ? "text-muted opacity-50 cursor-not-allowed" : "text-primary hover:bg-main"}`} title="Video Call">
                    <Video size={24} />
                </button>
                <button onClick={() => onCall(false)} disabled={isChatDisabled || !targetUser} className={`p-2 rounded-full transition ${isChatDisabled || !targetUser ? "text-muted opacity-50 cursor-not-allowed" : "text-primary hover:bg-main"}`} title="Voice Call">
                    <Phone size={22} />
                </button>
                <button onClick={onInfo} className="p-2.5 rounded-full hover:bg-main text-muted hover:text-primary transition">
                    <MoreVertical size={20} />
                </button>
            </div>
        </div>
    );
});

ChatHeader.displayName = "ChatHeader";

export default ChatHeader;
