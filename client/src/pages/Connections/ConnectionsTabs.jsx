import React, { memo } from "react";
import { motion } from "framer-motion";

const ConnectionsTabs = memo(({ tabs, currentTab, setCurrentTab, setSearchQuery }) => (
    <div className="relative mb-8">
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible gap-2 border-b border-adaptive scrollbar-hide scroll-smooth">
            {tabs.map((tab) => {
                const hasPendingAction = tab.id === "Pending" && tab.data?.length > 0;
                const isActive = currentTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setCurrentTab(tab.id);
                            setSearchQuery("");
                        }}
                        className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold transition-all relative group whitespace-nowrap
                            ${isActive
                                ? "text-primary bg-primary/5"
                                : "text-muted hover:text-content hover:bg-surface/50"
                            }`}
                    >
                        <tab.icon
                            size={18}
                            className={`transition-colors ${isActive ? "text-primary" : "text-muted group-hover:text-content"}`}
                        />
                        <span className="text-sm md:text-base">{tab.label}</span>

                        <span className={`text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full font-extrabold transition-all duration-300
                            ${hasPendingAction
                                ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30 scale-110"
                                : isActive
                                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                                    : "bg-adaptive text-muted group-hover:bg-main group-hover:text-content"
                            }`}
                        >
                            {tab.data?.length || 0}
                        </span>

                        {isActive && (
                            <motion.div
                                layoutId="activeConnectionTab"
                                className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary rounded-t-full"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    </div>
));

ConnectionsTabs.displayName = "ConnectionsTabs";

export default ConnectionsTabs;
