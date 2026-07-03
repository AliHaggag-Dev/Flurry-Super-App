import React, { memo } from "react";
import { BellOff, Bell, LogOut, Trash2, Ban, Lock, Unlock } from "lucide-react";

export const ActionsSection = memo(({
    isGroup, isMuted, isBlocked, loading, isOwner, isChatLocked,
    onMuteToggle, onBlockToggle, onToggleLock, onLeave, onDelete, t
}) => (
    <div className="space-y-3 border-t border-adaptive pt-6 pb-8">
        <button
            onClick={onMuteToggle}
            className="w-full flex items-center justify-between p-4 bg-main hover:bg-main/80 rounded-2xl transition-all group border border-adaptive hover:border-primary/30 shadow-sm"
        >
            <div className="flex items-center gap-3 text-content font-bold">
                {isMuted ? <BellOff size={18} className="text-red-500" /> : <Bell size={18} className="text-primary" />}
                <span className="text-sm">{isMuted ? t("chatInfo.unmute") : t("chatInfo.mute")}</span>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${isMuted ? "bg-primary" : "bg-zinc-600"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isMuted ? "start-6" : "start-1"}`} />
            </div>
        </button>

        {!isGroup && (
            <button
                onClick={onBlockToggle}
                disabled={loading}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group border ${isBlocked ? "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10" : "bg-red-500/5 hover:bg-red-500/10 text-red-500 border-red-500/10 hover:border-red-500/30"}`}
            >
                <div className="flex items-center gap-3 font-bold text-sm">
                    <Ban size={18} />
                    <span>{isBlocked ? t("chatInfo.unblock") : t("chatInfo.block")}</span>
                </div>
            </button>
        )}

        {isGroup && isOwner && (
            <button
                onClick={onToggleLock}
                disabled={loading}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group border ${isChatLocked ? "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10" : "bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 border-amber-500/10 hover:border-amber-500/30"}`}
            >
                <div className="flex items-center gap-3 font-bold text-sm">
                    {isChatLocked ? <Unlock size={18} /> : <Lock size={18} />}
                    <span>{isChatLocked ? t("chatInfo.unlockChat") : t("chatInfo.lockChat")}</span>
                </div>
            </button>
        )}

        {isGroup && (
            <button
                onClick={onLeave}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl border border-red-500/10 hover:border-red-500/30 transition-all font-bold text-sm"
            >
                <LogOut size={18} />
                <span>{t("chatInfo.leaveGroup")}</span>
            </button>
        )}

        {(!isGroup || isOwner) && (
            <button
                onClick={onDelete}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl border border-red-500/10 hover:border-red-500/30 transition-all font-bold text-sm"
            >
                <Trash2 size={18} />
                <span>{isGroup ? t("chatInfo.deleteGroup") : t("chatInfo.deleteChat")}</span>
            </button>
        )}
    </div>
));

ActionsSection.displayName = "ActionsSection";

export default ActionsSection;
