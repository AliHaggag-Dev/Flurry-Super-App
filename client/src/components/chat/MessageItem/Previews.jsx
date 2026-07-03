import React, { memo } from "react";

export const ReplyPreview = memo(({ replyTo, isMe, scrollToMessage }) => {
    if (!replyTo) return null;
    return (
        <div
            onClick={(e) => { e.stopPropagation(); scrollToMessage(String(replyTo._id || replyTo)); }}
            className={`rounded-lg p-2 mb-2 text-xs cursor-pointer overflow-hidden border-s-[3px] transition-colors ${isMe ? "bg-black/20 border-white/40" : "bg-main border-primary/60"}`}
        >
            <span className={`font-bold block mb-0.5 ${isMe ? "text-white/90" : "text-primary"}`}>{replyTo.sender?.full_name}</span>
            <span className="truncate opacity-80 block">{replyTo.message_type === 'image' ? "📷 Photo" : replyTo.text}</span>
        </div>
    );
});

ReplyPreview.displayName = "ReplyPreview";

export const StoryReplyPreview = memo(({ storyId, isMe }) => {
    if (!storyId) return null;

    const isVideo = storyId.type === 'video' || storyId.mediaUrl?.endsWith('.mp4');
    const isText = storyId.type === 'text';

    return (
        <div className={`flex items-center gap-2 p-1.5 rounded-lg mb-1.5 border-l-[3px] select-none transition ${isMe ? "bg-white/20 border-white/50" : "bg-black/5 dark:bg-white/5 border-primary"}`}>
            <div className="h-12 w-9 shrink-0 rounded overflow-hidden bg-black border border-white/10 relative">
                {isVideo ? (
                    <video src={storyId.mediaUrl} className="h-full w-full object-cover opacity-80" muted />
                ) : isText ? (
                    <div className="h-full w-full flex items-center justify-center p-0.5 text-[6px] text-center text-white/80 overflow-hidden leading-tight" style={{ background: storyId.background_color || '#333' }}>
                        {storyId.content?.slice(0, 10)}
                    </div>
                ) : (
                    <img src={storyId.image || storyId.mediaUrl || "/avatar-placeholder.png"} className="h-full w-full object-cover" alt="story" onError={(e) => { e.target.style.display = 'none' }} />
                )}
            </div>
            <div className="flex flex-col justify-center min-w-0">
                <span className={`text-[10px] font-bold mb-0.5 ${isMe ? "text-white/90" : "text-primary"}`}>Replied to story</span>
                <span className={`text-[10px] truncate w-32 ${isMe ? "text-white/70" : "text-muted"}`}>{storyId.content || "Media content"}</span>
            </div>
        </div>
    );
});

StoryReplyPreview.displayName = "StoryReplyPreview";
