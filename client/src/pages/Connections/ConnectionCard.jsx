import React, { useCallback, memo } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, X, Clock, MessageSquare, UserMinus } from "lucide-react";
import UserAvatar from "../../components/common/UserDefaultAvatar";

const ConnectionCard = memo(({
    user, type, requestType, onUnfollow, onAccept, onReject,
    onAcceptFollow, onDeclineFollow, navigate, t
}) => {

    const handleProfileClick = useCallback((e) => {
        e.stopPropagation();
        navigate(`/profile/${user._id}`);
    }, [navigate, user._id]);

    return (
        <motion.div
            layout // Smooth layout transitions
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            whileHover={{ y: -4 }}
            className="group relative bg-surface hover:bg-surface/80 border border-adaptive hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5"
        >
            <div className="flex items-start gap-4">
                <div className="relative shrink-0 cursor-pointer" onClick={handleProfileClick}>
                    <UserAvatar
                        user={user}
                        className="w-14 h-14 rounded-full border border-adaptive group-hover:border-primary transition-colors"
                    />
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-content text-base truncate cursor-pointer hover:text-primary transition-colors" onClick={handleProfileClick}>
                        {user?.full_name}
                    </h3>
                    <p className="text-xs text-muted truncate">{user?.username}</p>
                    {type === "Pending" && (
                        <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded border ${requestType === "follow" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"}`}>
                            {requestType === "follow" ? t("connections.types.follow") : t("connections.types.connection")}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-adaptive flex gap-2">
                {type === "Followers" && (
                    <button onClick={handleProfileClick} className="flex-1 py-2 rounded-xl bg-main hover:bg-surface border border-adaptive text-content text-xs font-bold transition hover:text-primary">
                        {t("connections.actions.viewProfile")}
                    </button>
                )}

                {type === "Following" && (
                    <>
                        <button onClick={handleProfileClick} className="flex-1 py-2 rounded-xl bg-main hover:bg-surface border border-adaptive text-content text-xs font-bold transition hover:text-primary">
                            {t("connections.actions.view")}
                        </button>
                        <button onClick={() => onUnfollow(user._id)} className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-eed-500/20 text-xs font-bold transition" aria-label="Unfollow">
                            <UserMinus size={16} />
                        </button>
                    </>
                )}

                {type === "Pending" && (
                    <>
                        {requestType === "follow" ? (
                            <>
                                <button onClick={() => onAcceptFollow(user._id)} className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold transition flex items-center justify-center gap-2 hover:opacity-90">
                                    <UserPlus size={16} /> {t("connections.actions.confirm")}
                                </button>
                                <button onClick={() => onDeclineFollow(user._id)} className="px-3 py-2 rounded-xl bg-surface border border-adaptive hover:bg-red-50 text-muted hover:text-red-500 text-xs font-bold transition">
                                    <X size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onAccept(user._id)} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-900/20">
                                    <UserCheck size={16} /> {t("connections.actions.accept")}
                                </button>
                                <button onClick={() => onReject(user._id)} className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-eed-500/20 text-xs font-bold transition">
                                    <X size={18} />
                                </button>
                            </>
                        )}
                    </>
                )}

                {type === "Sent" && (
                    <button onClick={() => requestType === "follow" ? onUnfollow(user._id) : onReject(user._id)} className="flex-1 py-2 rounded-xl bg-surface/50 hover:bg-red-500/10 hover:text-red-500 text-muted border border-adaptive hover:border-eed-500/20 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer">
                        <Clock size={16} />
                        {requestType === "follow" ? t("connections.actions.cancelFollow") : t("connections.actions.cancelRequest")}
                    </button>
                )}

                {type === "Connections" && (
                    <button onClick={() => navigate(`/messages/${user._id}`)} className="flex-1 py-2 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                        <MessageSquare size={16} /> {t("connections.actions.message")}
                    </button>
                )}
            </div>
        </motion.div>
    );
});

ConnectionCard.displayName = "ConnectionCard";

export default ConnectionCard;
