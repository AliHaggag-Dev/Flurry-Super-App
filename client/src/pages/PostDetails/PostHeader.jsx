import React, { memo } from "react";
import { ArrowLeft, MoreHorizontal, Link2, Bookmark, PenLine, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const PostHeader = memo(({
    navigate, post, isOwner, isSaved,
    showOptionsMenu, setShowOptionsMenu,
    onCopyLink, onSave, onDelete, onEdit, onReport, t
}) => (
    <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-xl border-b border-adaptive px-4 py-3 flex items-center gap-4 shadow-sm transition-all duration-300">
        <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-main rounded-full transition active:scale-95 text-content group rtl:scale-x-[-1]"
            aria-label="Go back"
        >
            <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <div className="flex-1 text-start">
            <h1 className="text-base font-bold text-content leading-tight">{t("postDetails.title")}</h1>
            <p
                className="text-xs text-muted font-medium cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/profile/${post?.user?._id}`)}
            >
                {t("postDetails.by")} {post?.user?.full_name || t("stories.defaultUser")}
            </p>
        </div>

        {/* Options Menu */}
        <div className="relative ms-auto">
            <button
                onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); }}
                className="p-2 hover:bg-main rounded-full text-muted hover:text-content transition"
            >
                <MoreHorizontal size={20} />
            </button>
            <AnimatePresence>
                {showOptionsMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowOptionsMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute end-0 top-full mt-2 w-48 bg-surface rounded-xl border border-adaptive shadow-xl z-50 overflow-hidden"
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
                            ) : null}
                            {!isOwner && (
                                <button onClick={onReport} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
                                    <ArrowLeft className="rotate-180 hidden" /> {/* Placeholder/Icon Fix */}
                                    <span>Report</span> {/* Fallback/Icon needed based on import */}
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
