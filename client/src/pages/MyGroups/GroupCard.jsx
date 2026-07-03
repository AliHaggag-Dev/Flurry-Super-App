import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, Clock, Users, MessageCircle, Settings } from "lucide-react";

const GroupCard = React.memo(({ group, userId, currentUser, navigate, t }) => {
    // Logic to determine membership status
    const isOwner = group.owner?.clerkId === userId;
    const activeMembersCount = group.members?.filter(m => m.status === 'accepted').length || 0;
    const pendingCount = group.members?.filter(m => m.status === 'pending').length || 0;

    // Strict user identification logic
    const myMemberRecord = useMemo(() => {
        return group.members?.find(m => {
            if (!m.user) return false;
            return (m.user.clerkId === userId) ||
                (m.user._id === currentUser?._id) ||
                (m.user === currentUser?._id);
        });
    }, [group.members, userId, currentUser]);

    const isPending = myMemberRecord?.status === 'pending';

    const handleCardClick = () => {
        if (isPending) return;
        navigate(`/groups/${group._id}/chat`);
    };

    const handleSettingsClick = (e) => {
        e.stopPropagation();
        navigate(`/groups/${group._id}/requests`);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleCardClick}
            className={`
                bg-surface p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-sm flex flex-col group
                ${isPending
                    ? "border-yellow-500/40 bg-yellow-500/5 cursor-default opacity-90"
                    : "border-adaptive hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                }
            `}
        >
            {/* Status Badges */}
            {isOwner && (
                <div className="absolute top-0 end-0 bg-linear-to-bl from-amber-500/20 to-transparent px-4 py-2 rounded-bl-3xl border-b border-s border-amber-500/10 rtl:rounded-bl-none rtl:rounded-br-3xl rtl:border-s-0 rtl:border-e">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                        <Crown size={12} fill="currentColor" /> {t("myGroups.owner")}
                    </span>
                </div>
            )}

            {isPending && (
                <div className="absolute top-0 end-0 bg-linear-to-bl from-yellow-500/20 to-transparent px-4 py-2 rounded-bl-3xl border-b border-s border-yellow-500/10 rtl:rounded-bl-none rtl:rounded-br-3xl rtl:border-s-0 rtl:border-e">
                    <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 flex items-center gap-1 uppercase tracking-wider">
                        <Clock size={12} /> {t("myGroups.pending")}
                    </span>
                </div>
            )}

            {/* Header Info */}
            <div className="flex items-center gap-5 mb-6">
                <img
                    src={group.group_image}
                    alt={group.name}
                    loading="lazy"
                    className={`
                        w-16 h-16 rounded-2xl object-cover ring-2 transition-all shadow-md bg-main
                        ${isPending ? "ring-yellow-500/20 grayscale-[0.5]" : "ring-adaptive group-hover:ring-primary/50"}
                    `}
                />
                <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-xl leading-tight mb-1 truncate transition-colors ${isPending ? "text-content/70" : "text-content group-hover:text-primary"}`}>
                        {group.name}
                    </h3>
                    <p className="text-xs text-muted flex items-center gap-1.5 font-medium bg-main/50 w-fit px-2 py-1 rounded-sg">
                        <Users size={14} />
                        <span className="text-content font-bold">{activeMembersCount}</span> {t("myGroups.members")}
                    </p>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-3 mt-auto pt-4 border-t border-adaptive">
                <button
                    disabled={isPending}
                    className={`
                        flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95
                        ${isPending
                            ? "bg-main text-yellow-600 border border-yellow-500/20 opacity-100 cursor-not-allowed shadow-none"
                            : "bg-linear-to-r from-primary to-primary/80 hover:opacity-90 text-white shadow-primary/20"
                        }
                    `}
                >
                    {isPending ? (
                        <>
                            <Clock size={18} />
                            <span className="whitespace-nowrap">{t("myGroups.waitingApproval")}</span>
                        </>
                    ) : (
                        <>
                            <MessageCircle size={18} className="text-white" />
                            <span className="whitespace-nowrap">{t("myGroups.openChat")}</span>
                        </>
                    )}
                </button>

                {isOwner && (
                    <button
                        onClick={handleSettingsClick}
                        className="w-14 flex items-center justify-center bg-main hover:bg-surface text-muted hover:text-primary rounded-xl transition-all border border-adaptive hover:border-primary/30 relative shadow-sm group/settings"
                        title={t("myGroups.settings")}
                    >
                        <Settings size={22} className="group-hover/settings:rotate-90 transition-transform duration-500" />
                        {pendingCount > 0 && (
                            <span className="absolute -top-1 -end-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-surface"></span>
                            </span>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
});

GroupCard.displayName = "GroupCard";

export default GroupCard;
