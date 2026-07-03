import React, { memo } from "react";
import { Heart, MessageCircle, Share2, Send, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export const PostFooter = memo(({
    likesCount, commentsCount, sharesCount, isLiked,
    showShareMenu, setShowShareMenu,
    onLike, onNavigatePost, onInternalShareClick, onExternalShare, t
}) => (
    <div className="flex items-center justify-between pt-4 mt-2 px-2 border-t border-adaptive">
        <div className="flex items-center gap-4">
            <button onClick={onLike} aria-label="Like" className="group flex items-center gap-1.5 focus:outline-none transition-all">
                <Heart size={22} className={`transition-all duration-300 group-hover:scale-110 ${isLiked ? "text-primary fill-primary drop-shadow-[0_0_8px_rgba(var(--color-primary),0.4)]" : "text-muted group-hover:text-primary"}`} />
                <span className={`text-sm font-medium transition-colors ${isLiked ? "text-primary" : "text-muted"}`}>{likesCount}</span>
            </button>
            <button onClick={onNavigatePost} aria-label="Comment" className="group flex items-center gap-1.5 focus:outline-none transition-all">
                <MessageCircle size={22} className="text-muted transition-all duration-300 group-hover:text-primary group-hover:scale-110" />
                <span className="text-sm font-medium text-muted group-hover:text-primary transition-colors">{commentsCount}</span>
            </button>
        </div>

        <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu); }} aria-label="Share" className="group flex items-center gap-1.5 focus:outline-none transition-all">
                <span className={`text-sm font-medium transition-colors ${sharesCount > 0 ? "text-primary" : "text-muted group-hover:text-primary"}`}>
                    {sharesCount > 0 ? sharesCount : t("post.share")}
                </span>
                <Share2 size={22} className={`transition-all duration-300 group-hover:scale-110 ${sharesCount > 0 ? "text-primary" : "text-muted group-hover:text-primary"}`} />
            </button>
            <AnimatePresence>
                {showShareMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute end-0 bottom-full mb-3 w-48 bg-surface rounded-xl border border-adaptive shadow-xl z-20 overflow-hidden"
                        >
                            <button onClick={onInternalShareClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-content hover:bg-main transition-colors border-b border-adaptive">
                                <Send size={16} className="text-primary rtl:rotate-180" /> <span>{t("post.sendInApp")}</span>
                            </button>
                            <button onClick={onExternalShare} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-content hover:bg-main transition-colors">
                                <ExternalLink size={16} className="text-primary rtl:rotate-180" /> <span>{t("post.shareVia")}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    </div>
));

PostFooter.displayName = "PostFooter";

export default PostFooter;
