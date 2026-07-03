import React, { memo } from "react";
import { motion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

export const ViewersListModal = memo(({ show, onClose, viewers, currentUser, t, currentLocale }) => {
    if (!show) return null;

    // Filter Logic
    const filteredViewers = viewers?.filter(v => v.user?.username !== currentUser.username) || [];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-end justify-center pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md h-[60vh] bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1a1a1a]">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Eye size={20} className="text-blue-500" />
                        {t("stories.player.storyViews")} ({viewers?.length || 0})
                    </h3>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition">
                        <X size={18} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#1a1a1a]">
                    {filteredViewers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
                            <Eye size={40} />
                            <p>{t("stories.player.noViews")}</p>
                        </div>
                    ) : (
                        filteredViewers.map((viewRecord) => {
                            const viewerData = viewRecord.user;
                            if (!viewerData) return null;
                            return (
                                <div key={viewerData._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={viewerData?.profile_picture || "/avatar-placeholder.png"} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="v" />
                                            {viewRecord.reaction && (
                                                <span className="absolute -bottom-1 -end-1 text-sm bg-[#1a1a1a] rounded-full p-0.5 border border-white/10">
                                                    {viewRecord.reaction}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm flex items-center gap-2 text-start">{viewerData?.full_name}</p>
                                            <p className="text-white/40 text-xs text-start">@{viewerData?.username}</p>
                                        </div>
                                    </div>
                                    <span className="text-white/30 text-xs font-medium">
                                        {formatDistanceToNowStrict(new Date(viewRecord.viewedAt), { addSuffix: true, locale: currentLocale })}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
});

ViewersListModal.displayName = "ViewersListModal";

export default ViewersListModal;
