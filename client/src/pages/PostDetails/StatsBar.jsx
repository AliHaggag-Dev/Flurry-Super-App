import React, { memo } from "react";
import { MessageCircle, Share2, Send, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const StatsBar = memo(({
    commentsCount, sharesCount, showShareMenu, setShowShareMenu,
    setShowInternalShareModal, onExternalShare, t
}) => (
    <div className="pt-4 border-t border-adaptive flex items-center justify-between text-sm text-muted">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-main rounded-full border border-adaptive">
            <MessageCircle size={16} className="text-primary" />
            <span className="font-bold text-content">{commentsCount}</span> {t("notifications.tabs.comments")}
        </div>
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${showShareMenu ? "bg-primary text-white" : "hover:bg-main text-muted hover:text-primary"}`}
            >
                <Share2 size={18} />
                {sharesCount > 0 && <span className="font-bold">{sharesCount}</span>}
            </button>

            <AnimatePresence>
                {showShareMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute end-0 bottom-full mb-2 w-48 bg-surface rounded-xl border border-adaptive shadow-xl z-20 overflow-hidden"
                        >
                            <button
                                onClick={() => { setShowShareMenu(false); setShowInternalShareModal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-content hover:bg-main transition-colors border-b border-adaptive"
                            >
                                <Send size={16} className="text-primary rtl:rotate-180" /> <span>{t("post.sendInApp")}</span>
                            </button>
                            <button
                                onClick={onExternalShare}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-content hover:bg-main transition-colors"
                            >
                                <ExternalLink size={16} className="text-primary rtl:rotate-180" /> <span>{t("post.shareVia")}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    </div>
));

StatsBar.displayName = "StatsBar";

export default StatsBar;
