import React, { memo } from "react";
import { Search, X } from "lucide-react";

const ConnectionsHeader = memo(({ searchQuery, setSearchQuery, currentTab, t }) => (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="w-full text-start md:text-start">
            <h1 className="text-3xl md:text-4xl font-extrabold text-content mb-1">
                {t("connections.pageTitle")}
            </h1>
            <p className="text-muted text-sm font-medium">
                {t("connections.pageSubtitle")}
            </p>
        </div>

        <div className="relative w-full md:w-72 group">
            <div className="relative flex items-center bg-surface rounded-xl p-1 border border-adaptive focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300 shadow-sm">
                <Search className="ms-3 text-muted w-4 h-4 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder={t("connections.searchPlaceholder", { tab: currentTab })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-content px-3 py-2 text-sm focus:outline-none border-none outline-none ring-0 placeholder-muted/70"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="p-1 me-1 text-muted hover:text-primary hover:bg-main rounded-full transition"
                        aria-label="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    </header>
));

ConnectionsHeader.displayName = "ConnectionsHeader";

export default ConnectionsHeader;
