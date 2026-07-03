import React, { memo } from "react";
import { MessageSquare, Search, Edit } from "lucide-react";

export const RecentHeader = memo(({ searchQuery, setSearchQuery, onNewChatClick, totalUnreadCount, t }) => (
    <div className="p-4 border-b border-adaptive">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black flex items-center gap-2 text-content tracking-tight select-none">
                <MessageSquare className="text-primary w-5 h-5" />
                {t("messages.messagesTitle")}
                {totalUnreadCount > 0 && (
                    <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold shadow-md shadow-primary/20 animate-pulse">
                        {totalUnreadCount}
                    </span>
                )}
            </h2>
            <button
                onClick={onNewChatClick}
                className="p-2 hover:bg-main rounded-xl text-primary hover:text-primary/80 transition-all border border-adaptive hover:border-primary/20 hover:scale-105 active:scale-95 shadow-xs"
                title={t("messages.newChat")}
            >
                <Edit size={16} />
            </button>
        </div>

        {/* Search */}
        <div className="relative group">
            <div className="relative flex items-center bg-main rounded-xl border border-adaptive focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
                <Search size={14} className="ms-3 text-muted group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder={t("messages.searchChats")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-content px-3 py-2 text-xs focus:outline-none border-none outline-none ring-0 placeholder-muted/50"
                />
            </div>
        </div>
    </div>
));

RecentHeader.displayName = "RecentHeader";

export default RecentHeader;
