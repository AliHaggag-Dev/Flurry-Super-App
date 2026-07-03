import React from 'react';
import { ArrowLeft, Loader2, Sparkles, MoreVertical } from "lucide-react";

const ChatHeader = React.memo(({ groupInfo, t, navigate, handleSummarizeChat, isSummarizing, setShowChatInfo }) => (
    <div className="absolute top-0 start-0 end-0 h-20 bg-surface/90 backdrop-blur-md flex items-center justify-between px-4 z-20 border-adaptive shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-main rounded-full transition text-muted hover:text-content rtl:scale-x-[-1]"><ArrowLeft size={22} /></button>
            <div className="relative"><img src={groupInfo?.group_image} alt="group" className="w-11 h-11 rounded-full object-cover ring-1 ring-border-adaptive" /></div>
            <div><h3 className="font-bold text-content text-lg leading-tight">{groupInfo?.name}</h3><p className="text-xs text-muted font-medium">{t("groupChat.membersActive", { count: groupInfo?.members?.length || 0 })}</p></div>
        </div>
        <div className="flex items-center gap-1">
            <button
                onClick={handleSummarizeChat}
                disabled={isSummarizing}
                className={`p-2 rounded-full transition relative group ${isSummarizing ? "animate-pulse" : "hover:bg-primary/10 text-primary"}`}
                title="Summarize Chat"
            >
                {isSummarizing ? <Loader2 size={22} className="animate-spin" /> : <Sparkles size={22} />}
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">Summarize</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowChatInfo(true); }} className="p-2 rounded-full transition hover:bg-main text-muted hover:text-content"><MoreVertical size={22} /></button>
        </div>
    </div>
));

ChatHeader.displayName = "ChatHeader";

export default ChatHeader;
