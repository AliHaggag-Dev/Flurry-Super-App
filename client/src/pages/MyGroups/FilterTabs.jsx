import React, { useMemo } from "react";
import { motion } from "framer-motion";

const FilterTabs = React.memo(({ filter, setFilter, t }) => {
    const tabs = useMemo(() => [
        { id: 'all', label: t("myGroups.tabs.all") },
        { id: 'managed', label: t("myGroups.tabs.managed") },
        { id: 'joined', label: t("myGroups.tabs.joined") }
    ], [t]);

    return (
        <div className="flex bg-surface p-1.5 rounded-2xl w-full md:w-fit mb-10 border border-adaptive shadow-sm overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`
                        flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap relative
                        ${filter === tab.id
                            ? "text-primary bg-primary/10 shadow-sm"
                            : "text-muted hover:text-content hover:bg-main"
                        }
                    `}
                >
                    {tab.label}
                    {filter === tab.id && (
                        <motion.div
                            layoutId="activeGroupTab"
                            className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary rounded-full mx-4 mb-1"
                        />
                    )}
                </button>
            ))}
        </div>
    );
});

FilterTabs.displayName = "FilterTabs";

export default FilterTabs;
