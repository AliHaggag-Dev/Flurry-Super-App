import React, { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Camera,
    Edit3,
    BadgeCheck,
    Ban,
    Lock,
    Settings,
    UserCheck,
    ChevronDown,
    UserX,
    Clock,
    UserPlus,
    ShieldAlert,
    MessageCircle,
} from "lucide-react";
import UserAvatar from "../../components/common/UserDefaultAvatar.jsx";

const isSameId = (id1, id2) => {
    if (!id1 || !id2) return false;
    return id1.toString() === id2.toString();
};

export const ProfileHero = memo(({ profileUser, isRestricted, isMyProfile, onEditClick }) => (
    <div className="h-64 md:h-80 w-full relative overflow-hidden group bg-surface">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-10"></div>
        {!isRestricted && profileUser.cover_photo ? (
            <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.5 }}
                src={profileUser.cover_photo}
                className="w-full h-full object-cover"
                alt="cover"
            />
        ) : (
            <div className={`w-full h-full ${isRestricted ? "bg-black/90" : "bg-gradient-to-br from-primary/80 to-black"}`}></div>
        )}
        {isMyProfile && (
            <button
                onClick={onEditClick}
                className="absolute top-4 end-4 z-20 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer"
            >
                <Camera size={20} />
            </button>
        )}
    </div>
));

ProfileHero.displayName = "ProfileHero";

export const ProfileAvatar = memo(({ profileUser, isRestricted, isMyProfile, onEditClick }) => (
    <div className="flex -mt-16 md:-mt-20 items-center justify-center md:justify-start shrink-0">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative group mt-16 md:mt-0 ${isRestricted ? "pointer-events-none cursor-default md:mt-16" : "cursor-pointer"
                }`}
        >
            <UserAvatar
                user={profileUser}
                className={`w-32 h-32 md:w-44 md:h-44 rounded-full object-cover shadow-2xl border-4 border-surface ${isRestricted ? "grayscale opacity-50" : ""
                    }`}
            />
            {isMyProfile && !isRestricted && (
                <button
                    onClick={onEditClick}
                    className="absolute bottom-2 end-2 p-2.5 bg-primary text-white rounded-full shadow-lg ring-4 ring-surface z-20 pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
                >
                    <Edit3 size={18} />
                </button>
            )}
        </motion.div>
    </div>
));

ProfileAvatar.displayName = "ProfileAvatar";

export const ProfileInfo = memo(({ profileUser, isBlockedByMe, isBlockedByTarget, t }) => (
    <div className="text-center md:text-start space-y-1">
        <h1 className="text-3xl md:text-4xl font-black text-content flex items-center justify-center md:justify-start gap-2">
            {profileUser.full_name}
            {profileUser.isVerified && (
                <BadgeCheck className="w-6 h-6 md:w-8 md:h-8 text-primary fill-primary/10" />
            )}
        </h1>
        <p className="text-muted font-medium text-base md:text-lg">@{profileUser.username}</p>

        {isBlockedByMe && (
            <p className="text-red-500 font-bold text-sm mt-1 flex items-center gap-1 justify-center md:justify-start bg-red-500/10 px-3 py-1 rounded-full w-fit mx-auto md:mx-0 border border-red-500/20">
                <Ban size={14} /> {t("profile.states.blockedByMe")}
            </p>
        )}
        {isBlockedByTarget && (
            <p className="text-muted font-bold text-sm mt-1 flex items-center gap-1 justify-center md:justify-start bg-surface px-3 py-1 rounded-full w-fit mx-auto md:mx-0 border border-adaptive">
                <Lock size={14} /> {t("profile.states.userUnavailable")}
            </p>
        )}
    </div>
));

ProfileInfo.displayName = "ProfileInfo";

export const ProfileActions = memo(({
    isMyProfile,
    isBlockedByMe,
    isBlockedByTarget,
    profileUser,
    followStatus,
    connectionStatus,
    showConnectionMenu,
    setShowConnectionMenu,
    onEdit,
    onBlock,
    onFollow,
    onConnect,
    onAccept,
    onRemoveConnection,
    onMessage,
    t
}) => (
    <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end flex-wrap mt-4">
        {isBlockedByMe ? (
            <button
                onClick={onBlock}
                className="px-6 py-2.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition shadow-lg flex items-center gap-2"
            >
                <ShieldAlert size={18} /> {t("profile.actions.unblock")}
            </button>
        ) : isBlockedByTarget ? (
            null
        ) : isMyProfile ? (
            <button
                onClick={onEdit}
                className="px-6 py-2.5 bg-main hover:bg-surface text-content rounded-2xl font-bold transition border border-adaptive flex items-center gap-2 shadow-sm"
            >
                <Settings size={18} /> <span className="hidden sm:inline">{t("profile.actions.editProfile")}</span>
            </button>
        ) : (
            <>
                {/* Follow Button */}
                <button
                    onClick={onFollow}
                    className={`px-8 py-2.5 rounded-2xl font-bold transition shadow-lg active:scale-95 ${followStatus === "following"
                        ? "bg-main border border-adaptive text-content hover:border-red-500/30 hover:text-red-500"
                        : followStatus === "requested"
                            ? "bg-surface text-muted border border-adaptive"
                            : "bg-primary text-white hover:opacity-90"
                        }`}
                >
                    {followStatus === "following"
                        ? t("profile.actions.unfollow")
                        : followStatus === "requested"
                            ? t("profile.actions.requested")
                            : t("profile.actions.follow")}
                </button>

                {/* Connection & Message Buttons */}
                {(!profileUser.isPrivate || followStatus === "following" || connectionStatus !== "none") && (
                    <>
                        {connectionStatus === "connected" ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={onMessage}
                                    className="p-3 bg-main border border-adaptive text-primary rounded-2xl hover:bg-primary/5 transition"
                                >
                                    <MessageCircle size={20} />
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowConnectionMenu(!showConnectionMenu)}
                                        className="px-4 py-3 bg-green-500/10 text-green-600 border border-green-500/20 rounded-2xl font-bold hover:bg-green-500/20 transition flex items-center gap-2"
                                    >
                                        <UserCheck size={20} /> <span className="hidden sm:inline">{t("profile.actions.connected")}</span>
                                        <ChevronDown size={16} />
                                    </button>
                                    <AnimatePresence>
                                        {showConnectionMenu && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowConnectionMenu(false)}></div>
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute end-0 top-14 bg-surface border border-adaptive rounded-xl shadow-xl z-20 w-48 overflow-hidden"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            onRemoveConnection();
                                                            setShowConnectionMenu(false);
                                                        }}
                                                        className="w-full text-start px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition"
                                                    >
                                                        <UserX size={18} /> {t("profile.actions.removeConnection")}
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : connectionStatus === "sent" ? (
                            <button disabled className="px-6 py-2.5 bg-surface text-muted border border-adaptive rounded-2xl font-bold cursor-default flex items-center gap-2">
                                <Clock size={20} /> {t("profile.actions.requestSent")}
                            </button>
                        ) : connectionStatus === "received" ? (
                            <button
                                onClick={onAccept}
                                className="px-6 py-2.5 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition shadow-md flex items-center gap-2"
                            >
                                <UserCheck size={20} /> {t("profile.actions.acceptRequest")}
                            </button>
                        ) : (
                            <button
                                onClick={onConnect}
                                className="p-3 bg-main text-content border border-adaptive hover:text-primary rounded-2xl transition"
                            >
                                <UserPlus size={20} />
                            </button>
                        )}
                    </>
                )}
                <button
                    onClick={onBlock}
                    className="p-3 bg-main border-adaptive text-muted hover:text-red-500 hover:bg-red-500/5 rounded-2xl border transition"
                >
                    <ShieldAlert size={20} />
                </button>
            </>
        )}
    </div>
));

ProfileActions.displayName = "ProfileActions";

export const ProfileStats = memo(({ postsCount, profileUser, isContentLocked, loading, t }) => {
    const navigate = useNavigate();

    const handleFollowersClick = useCallback(() => {
        if (!isContentLocked && !loading) navigate(`/profile/${profileUser._id}/followers`);
    }, [isContentLocked, loading, navigate, profileUser]);

    const handleFollowingClick = useCallback(() => {
        if (!isContentLocked && !loading) navigate(`/profile/${profileUser._id}/following`);
    }, [isContentLocked, loading, navigate, profileUser]);

    const StatSkeleton = () => (
        <div className="h-8 w-12 bg-adaptive/50 rounded-md animate-pulse mx-auto mb-1"></div>
    );

    return (
        <div className="grid grid-cols-3 md:flex md:justify-start md:gap-12 w-full mt-8 pt-6 border-t border-adaptive/50">
            {/* Posts Count */}
            <div className="text-center group">
                {loading ? (
                    <StatSkeleton />
                ) : (
                    <span className="block text-xl sm:text-2xl font-black text-content">
                        {isContentLocked ? "-" : postsCount}
                    </span>
                )}
                <span className="text-[10px] sm:text-xs text-muted font-bold uppercase tracking-wider">
                    {t("profile.stats.posts")}
                </span>
            </div>

            {/* Followers */}
            <div
                onClick={handleFollowersClick}
                className={`text-center group ${isContentLocked || loading ? "cursor-default" : "cursor-pointer"}`}
            >
                {loading ? (
                    <StatSkeleton />
                ) : (
                    <span className={`block text-xl sm:text-2xl font-black text-content ${isContentLocked ? "" : "group-hover:text-primary"} transition-colors`}>
                        {isContentLocked ? "-" : profileUser.followers?.length || 0}
                    </span>
                )}
                <span className="text-[10px] sm:text-xs text-muted font-bold uppercase tracking-wider">
                    {t("profile.stats.followers")}
                </span>
            </div>

            {/* Following */}
            <div
                onClick={handleFollowingClick}
                className={`text-center group ${isContentLocked || loading ? "cursor-default" : "cursor-pointer"}`}
            >
                {loading ? (
                    <StatSkeleton />
                ) : (
                    <span className={`block text-xl sm:text-2xl font-black text-content ${isContentLocked ? "" : "group-hover:text-primary"} transition-colors`}>
                        {isContentLocked ? "-" : profileUser.following?.length || 0}
                    </span>
                )}
                <span className="text-[10px] sm:text-xs text-muted font-bold uppercase tracking-wider">
                    {t("profile.stats.following")}
                </span>
            </div>
        </div>
    );
});

ProfileStats.displayName = "ProfileStats";
