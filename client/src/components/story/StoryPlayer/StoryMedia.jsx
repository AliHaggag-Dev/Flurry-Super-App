import React, { memo } from "react";

export const StoryMedia = memo(({ activeStory, isVideo, isMuted, videoRef, onVideoEnd, fileUrl }) => {
    return (
        <div className="w-full h-full relative flex items-center justify-center bg-[#111]">
            {activeStory.type === "text" ? (
                <div
                    className="w-full h-full flex items-center justify-center p-8 text-center"
                    style={{ background: activeStory.background || activeStory.background_color || '#000' }}
                >
                    <p className="text-white text-2xl font-bold whitespace-pre-wrap">{activeStory.content}</p>
                </div>
            ) : (
                <>
                    {/* Background Blur */}
                    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden opacity-50 blur-3xl scale-125">
                        {isVideo ? (
                            <video src={fileUrl} className="w-full h-full object-cover" muted />
                        ) : (
                            <img src={fileUrl} className="w-full h-full object-cover" alt="blur-bg" />
                        )}
                    </div>
                    {/* Main Media */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                        {isVideo ? (
                            <video
                                ref={videoRef}
                                src={fileUrl}
                                muted={isMuted}
                                playsInline
                                className="max-w-full max-h-full object-contain pointer-events-none"
                                onEnded={onVideoEnd}
                            />
                        ) : (
                            <img
                                src={fileUrl}
                                alt="Story"
                                className="max-w-full max-h-full object-contain pointer-events-none"
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

StoryMedia.displayName = "StoryMedia";

export default StoryMedia;
