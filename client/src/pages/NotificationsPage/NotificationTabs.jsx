import React, { memo } from "react";

const NotificationTabs = memo(({ tabs, activeTab, setActiveTab, getUnreadCount }) => (
    <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide">
        {tabs.map((tab) => {
            const count = getUnreadCount(tab.key);
            return (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                        relative px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border whitespace-nowrap flex items-center gap-2 group
                        ${activeTab === tab.key
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105"
                            : "bg-surface text-muted border-adaptive hover:bg-main hover:text-content hover:border-primary/30"
                        }
                    `}
                >
                    {tab.label}
                    {count > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === tab.key ? "bg-white text-primary" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                            }`}>
                            {count}
                        </span>
                    )}
                </button>
            );
        })}
    </div>
));

NotificationTabs.displayName = "NotificationTabs";

export default NotificationTabs;
