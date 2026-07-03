import React from "react";
import { Users } from "lucide-react";

const EmptyState = ({ searchQuery, currentTab, t }) => (
    <div className="col-span-full flex flex-col items-center justify-center h-full min-h-[40vh] opacity-60">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 border border-adaptive group hover:border-primary/50 transition-colors">
            <Users size={32} className="text-muted group-hover:text-primary transition-colors" />
        </div>
        <p className="text-lg font-bold text-muted">
            {searchQuery
                ? t("connections.noResults", { query: searchQuery })
                : t("connections.emptyTab", { tab: currentTab })}
        </p>
    </div>
);

export default EmptyState;
