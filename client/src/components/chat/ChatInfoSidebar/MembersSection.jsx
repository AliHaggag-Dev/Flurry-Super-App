import React, { memo } from "react";
import { ChevronDown, UserMinus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import UserAvatar from "../../common/UserDefaultAvatar";

export const MemberItem = memo(({ member, isOwner, amIAdmin, currentUserId, onKick, onClick, t }) => {
    const isMe = member._id === currentUserId;

    return (
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center justify-between p-2.5 hover:bg-main rounded-xl transition cursor-pointer group/item border border-transparent hover:border-adaptive"
            onClick={() => onClick(member._id)}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <UserAvatar user={member} className="w-10 h-10 shrink-0" />
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate text-content">{member.full_name}</p>
                        {isOwner && <span className="text-[9px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-md font-bold border border-yellow-500/20">{t("chatInfo.ownerBadge")}</span>}
                        {isMe && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">{t("chatInfo.youBadge")}</span>}
                    </div>
                    <p className="text-xs text-muted truncate">@{member.username}</p>
                </div>
            </div>

            {amIAdmin && !isOwner && !isMe && (
                <button
                    onClick={(e) => { e.stopPropagation(); onKick(member._id, member.full_name); }}
                    className="p-2 text-red-500/50 hover:text-red-600 bg-transparent hover:bg-red-500/10 rounded-full transition-all md:opacity-0 group-hover/item:opacity-100"
                    title={t("chatInfo.removeMember")}
                >
                    <UserMinus size={18} />
                </button>
            )}
        </motion.div>
    );
});

MemberItem.displayName = "MemberItem";

export const MembersSection = memo(({ isGroup, members, isMembersOpen, setIsMembersOpen, ownerId, currentUserId, onKick, onNavigate, t }) => {
    if (!isGroup || !members) return null;

    return (
        <div className="border-t border-adaptive pt-4">
            <button
                onClick={() => setIsMembersOpen(!isMembersOpen)}
                className="w-full flex items-center justify-between py-2 px-1 text-muted hover:text-primary transition group"
            >
                <h4 className="text-xs font-black uppercase tracking-[0.2em]">{t("chatInfo.groupMembers", { count: members.length })}</h4>
                <ChevronDown size={16} className={`transition-transform duration-300 ${isMembersOpen ? "rotate-180 text-primary" : ""}`} />
            </button>
            <AnimatePresence>
                {isMembersOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-64 overflow-y-auto pe-2 space-y-2 custom-scrollbar mt-2 p-1">
                            {members.map((memberWrap, index) => {
                                const member = memberWrap?.user;
                                if (!member) return null;
                                return (
                                    <MemberItem
                                        key={member._id || index}
                                        member={member}
                                        isOwner={ownerId === member._id}
                                        amIAdmin={ownerId === currentUserId}
                                        currentUserId={currentUserId}
                                        onKick={onKick}
                                        onClick={onNavigate}
                                        t={t}
                                    />
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

MembersSection.displayName = "MembersSection";

export default MembersSection;
