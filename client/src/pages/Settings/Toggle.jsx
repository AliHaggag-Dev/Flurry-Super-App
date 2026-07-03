import React, { memo } from "react";

const Toggle = memo(({ label, checked, onChange }) => (
    <div
        className="flex items-center justify-between p-4 bg-surface rounded-xl border border-adaptive hover:border-primary/40 transition-colors group cursor-pointer"
        onClick={() => onChange(!checked)}
    >
        <span className="text-content font-medium group-hover:text-primary transition-colors">
            {label}
        </span>
        <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out ${checked ? "bg-primary" : "bg-muted/30"}`}>
            <div className={`absolute top-1 start-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-0"}`} />
        </div>
    </div>
));

Toggle.displayName = "Toggle";

export default Toggle;
