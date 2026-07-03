import React, { memo } from "react";
import { BadgeCheck, Link2, Bookmark, PenLine, Trash2, Check, Flag, MoreHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import UserAvatar from "../../common/UserDefaultAvatar";

export const PostHeader = memo(({
    user, timestamp, locale, isOwner, isSaved, hasReported,
    showOptionsMenu, setShowOptionsMenu,
    onNavigateProfile, onStorySeen,
    onCopyLink, onSave, onEdit, onDelete, onReport, t
}) => (
    <div className="flex items-center justify-between mb-4">
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 cursor-pointer group">
            <UserAvatar
                user={user}
                className="w-11 h-11 border rounded-full border-adaptive"
                onCloseStory={onStorySeen}
            />
            <div onClick={onNavigateProfile}>
                <div className="flex items-center gap-1.5">
                    <span className="font-bold text-content group-hover:text-primary transition text-[15px]">
                        {user?.full_name || t("stories.defaultUser")}
                    </span>
                    {user?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-muted text-xs font-medium">
                    @{user?.username || "username"} • {formatDistanceToNowStrict(new Date(timestamp), { locale, addSuffix: true })}
                </div>
            </div>
        </div>

        {/* Options Menu */}
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); }}
                aria-label="More options"
                className="p-2 text-muted hover:text-content hover:bg-main rounded-full transition"
            >
                <MoreHorizontal size={20} />
            </button>

            <AnimatePresence>
                {showOptionsMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowOptionsMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute end-0 top-full mt-2 w-48 bg-surface rounded-xl border border-adaptive shadow-xl z-20 overflow-hidden"
                        >
                            <button onClick={onCopyLink} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-content hover:bg-main transition-colors border-b border-adaptive">
                                <Link2 size={16} /> <span>{t("post.copyLink")}</span>
                            </button>
                            <button onClick={onSave} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-content hover:bg-main transition-colors border-b border-adaptive">
                                <Bookmark size={16} className={isSaved ? "fill-primary text-primary" : ""} />
                                <span>{isSaved ? t("post.unsave") : t("post.save")}</span>
                            </button>
                            {isOwner ? (
                                <>
                                    <button onClick={onEdit} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-content hover:bg-main transition-colors border-b border-adaptive">
                                        <PenLine size={16} /> <span>{t("post.edit")}</span>
                                    </button>
                                    <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
                                        <Trash2 size={16} /> <span>{t("post.delete")}</span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (!hasReported) onReport(); }}
                                    disabled={hasReported}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${hasReported ? "text-muted cursor-not-allowed bg-main" : "text-amber-500 hover:bg-amber-500/10"}`}
                                >
                                    {hasReported ? (
                                        <> <Check size={16} /> <span>{t("post.reported")}</span> </>
                                    ) : (
                                        <> <Flag size={16} /> <span>{t("post.report")}</span> </>
                                    )}
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    </div>
));

PostHeader.displayName = "PostHeader";

export default PostHeader;
