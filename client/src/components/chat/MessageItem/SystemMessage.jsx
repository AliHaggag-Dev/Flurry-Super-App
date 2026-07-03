import React, { memo } from "react";

export const SystemMessage = memo(({ text }) => (
    <div className="flex justify-center my-4 w-full">
        <span className="bg-surface/50 border border-adaptive/50 text-muted text-[10px] px-3 py-1 rounded-full shadow-sm backdrop-blur-sm select-none">
            {text}
        </span>
    </div>
));

SystemMessage.displayName = "SystemMessage";

export default SystemMessage;
