import React, { memo } from "react";

export const ReactionPills = memo(({ groupedReactions, isMe, hasMeReacted, onViewReactionMessage, isDeleted }) => {
    if (!groupedReactions.length || isDeleted) return null;

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onViewReactionMessage(); }}
            className={`
                absolute -bottom-4 ${isMe ? "start-0" : "end-0"} 
                flex items-center gap-1.5 
                bg-surface border border-adaptive rounded-full px-2 py-1 shadow-sm 
                cursor-pointer hover:scale-105 transition-transform z-10 select-none
            `}
        >
            {groupedReactions.map((group, i) => (
                <div key={i} className={`flex items-center gap-0.5 ${hasMeReacted(group.emoji) ? "opacity-100" : "opacity-80"}`}>
                    <span className="text-xs leading-none">{group.emoji}</span>
                    {group.count > 1 && (
                        <span className={`text-[10px] font-bold ${hasMeReacted(group.emoji) ? "text-primary" : "text-muted"}`}>
                            {group.count}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
});

ReactionPills.displayName = "ReactionPills";

export default ReactionPills;
