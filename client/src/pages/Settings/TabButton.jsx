import React, { memo } from "react";
import { motion } from "framer-motion";

const TabButton = memo(({ tab, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 relative overflow-hidden group whitespace-nowrap
        ${isActive ? "text-primary bg-primary/10 shadow-sm" : "text-muted hover:text-content hover:bg-surface"}`}
    >
        <span className="relative z-10 flex items-center gap-2 text-sm md:text-base">
            {tab.icon} {tab.label}
        </span>
        {isActive && (
            <motion.div layoutId="activeSettingTab" className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary" />
        )}
    </button>
));

TabButton.displayName = "TabButton";

export default TabButton;
