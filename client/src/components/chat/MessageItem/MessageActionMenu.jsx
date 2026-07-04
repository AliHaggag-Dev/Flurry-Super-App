import React, { memo } from "react";
import { Reply, Smile, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export const MessageActionMenu = memo(({
    isMe,
    isDeleted,
    isSending,
    showMobileMenu,
    onReply,
    onReact,
    onToggleMenu,
    showMenu,
    onEdit,
    onDelete,
    msg,
    t
}) => {
    if (isDeleted || isSending) return null;

    return (
        <div className={`
            absolute flex flex-col md:flex-row items-center gap-1 bg-surface/95 backdrop-blur-md border border-adaptive rounded-full p-1 shadow-lg z-20 transition-all duration-200
            top-1/2 -translate-y-1/2
            ${isMe ? "-start-11 md:-start-26 origin-right" : "-end-10 md:-end-18 origin-left"}
            ${showMobileMenu ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-90"}
            md:opacity-0 md:invisible md:scale-90
            md:group-hover/item:opacity-100 md:group-hover/item:visible md:group-hover/item:scale-100
        `}>
            {/* Reply Button */}
            <button onClick={onReply} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-full transition text-muted" title={t("Reply")}>
                <Reply size={14} />
            </button>

            {/* React Button */}
            <button onClick={onReact} className="p-1.5 hover:bg-yellow-500/10 hover:text-yellow-500 rounded-full transition text-muted" title={t("React")}>
                <Smile size={14} />
            </button>

            {/* Edit/Delete (Only for Me) */}
            {isMe && (
                <div className="relative">
                    <button onClick={onToggleMenu} className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-full transition text-muted">
                        <MoreVertical size={14} />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full mb-2 -right-2 w-28 bg-surface border border-adaptive rounded-xl shadow-xl overflow-hidden flex flex-col z-50"
                            >
                                <button onClick={(e) => { e.stopPropagation(); onEdit(msg); }} className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-main text-content transition-colors w-full text-start">
                                    <Edit2 size={13} /> {t("Edit")}
                                </button>
                                <div className="h-[1px] bg-border-adaptive w-full" />
                                <button onClick={(e) => { e.stopPropagation(); onDelete(msg._id); }} className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-red-500/10 text-red-500 transition-colors w-full text-start">
                                    <Trash2 size={13} /> {t("Delete")}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Menu Backdrop */}
                    {showMenu && <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onToggleMenu(e); }} />}
                </div>
            )}
        </div>
    );
});

MessageActionMenu.displayName = "MessageActionMenu";

export default MessageActionMenu;
