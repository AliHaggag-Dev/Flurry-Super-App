import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2, Grid, Image, Bookmark } from "lucide-react";

// --- API & Redux ---
import api from "../../lib/axios";
import { fetchMyConnections } from "../../features/connectionsSlice";

// --- Lazy Load Modals ---
const UpdateProfileModal = lazy(() => import("../../components/modals/UpdateProfileModal.jsx"));

// --- Sub-Components ---
import {
    ProfileHero,
    ProfileAvatar,
    ProfileInfo,
    ProfileActions,
    ProfileStats
} from "./ProfileHero";
import {
    PostsGrid,
    MediaGrid,
    SavedGrid,
    PrivateAccountState,
    TabNavigation
} from "./ProfileGrids";
import { ImageModal } from "./ImageModal";

const isSameId = (id1, id2) => {
    if (!id1 || !id2) return false;
    return id1.toString() === id2.toString();
};

/**
 * Profile Component
 *
 * A production-grade profile page displaying user details, stats, and content tabs.
 * Features optimistic UI updates, rigorous memoization, and theme-compliant styling.
 */
const Profile = () => {
    const { profileId } = useParams();
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();

    // --- Redux State ---
    const { currentUser } = useSelector((state) => state.user);

    // --- Derived State ---
    const targetProfileId = useMemo(
        () => profileId || (currentUser ? currentUser._id : null),
        [profileId, currentUser]
    );

    const isMyProfile = useMemo(
        () => currentUser && targetProfileId && isSameId(targetProfileId, currentUser._id),
        [currentUser, targetProfileId]
    );

    const TABS = useMemo(() => [
        { id: "posts", label: t("profile.tabs.posts"), icon: Grid },
        { id: "media", label: t("profile.tabs.media"), icon: Image },
        { id: "saved", label: t("profile.tabs.saved"), icon: Bookmark, private: true },
    ], [t]);

    // --- Local State ---
    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState(null);
    const [activeTab, setActiveTab] = useState("posts");
    const [showEdit, setShowEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showConnectionMenu, setShowConnectionMenu] = useState(false);

    const [savedPosts, setSavedPosts] = useState([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [isSavedFetched, setIsSavedFetched] = useState(false);

    const [connectionStatus, setConnectionStatus] = useState("none");
    const [followStatus, setFollowStatus] = useState("none");

    // --- Effects ---

    // 1. Fetch Profile Data
    useEffect(() => {
        let isMounted = true;

        const fetchProfileData = async () => {
            try {
                const token = await getToken();
                if (!targetProfileId) return;

                // Reset States on ID change
                if (profileUser && !isSameId(profileUser._id, targetProfileId)) {
                    setProfileUser(null);
                    setPosts(null);
                    setSavedPosts([]);
                    setIsSavedFetched(false);
                    setConnectionStatus("none");
                    setFollowStatus("none");
                    setActiveTab("posts");
                }

                if (isMyProfile && currentUser) {
                    setProfileUser((prev) => prev || currentUser);
                    setLoading(false);
                } else {
                    setLoading(true);
                }

                const { data } = await api.get(`/post/user/${targetProfileId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (isMounted && data.success) {
                    setProfileUser(data.user);
                    setPosts(data.posts || []);
                    setConnectionStatus(data.connectionStatus);
                    setFollowStatus(data.followStatus);
                }
            } catch (error) {
                console.error("Fetch Error:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (targetProfileId) fetchProfileData();

        return () => {
            isMounted = false;
        };
    }, [targetProfileId, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

    // 2. Fetch Saved Posts (Lazy)
    useEffect(() => {
        if (activeTab === "saved" && isMyProfile && !isSavedFetched) {
            const fetchSaved = async () => {
                setSavedLoading(true);
                try {
                    const token = await getToken();
                    const { data } = await api.get("/post/saved", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (data.success) {
                        setSavedPosts(data.posts || []);
                        setIsSavedFetched(true);
                    }
                } catch (error) {
                    toast.error(t("profile.toasts.savedError"));
                } finally {
                    setSavedLoading(false);
                }
            };
            fetchSaved();
        }
    }, [activeTab, isMyProfile, isSavedFetched, getToken, t]);

    // 3. Sync Local State with Redux
    useEffect(() => {
        if (isMyProfile && currentUser) {
            setProfileUser((prev) => {
                if (!prev) return currentUser;
                return {
                    ...prev,
                    full_name: currentUser.full_name,
                    username: currentUser.username,
                    bio: currentUser.bio,
                    location: currentUser.location,
                    profile_picture: currentUser.profile_picture,
                    cover_photo: currentUser.cover_photo,
                };
            });
        }
    }, [currentUser, isMyProfile]);

    // --- Handlers (Memoized) ---

    const handleEditProfile = useCallback(() => setShowEdit(true), []);

    const handleMessage = useCallback(() => {
        if (profileUser?._id) navigate(`/messages/${profileUser._id}`);
    }, [navigate, profileUser]);

    const handleImageSelect = useCallback((url) => setSelectedImage(url), []);

    const handleCloseImage = useCallback(() => setSelectedImage(null), []);

    const handleFollowToggle = useCallback(async () => {
        if (actionLoading || !profileUser) return;

        const oldStatus = followStatus;
        const isPrivate = profileUser.isPrivate;

        // Optimistic UI Update
        if (followStatus === "following" || followStatus === "requested") {
            setFollowStatus("none");
            setProfileUser((prev) => ({
                ...prev,
                followers: prev.followers.filter((id) => id !== currentUser._id),
            }));
        } else {
            setFollowStatus(isPrivate ? "requested" : "following");
            if (!isPrivate) {
                setProfileUser((prev) => ({
                    ...prev,
                    followers: [...prev.followers, currentUser._id],
                }));
            }
        }

        try {
            setActionLoading(true);
            const token = await getToken();
            const route =
                oldStatus === "following" || oldStatus === "requested" ? "unfollow" : "follow";
            const { data } = await api.post(
                `/user/${route}/${profileUser._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.status) setFollowStatus(data.status);
        } catch (error) {
            setFollowStatus(oldStatus); // Revert on error
            toast.error(t("profile.toasts.actionFailed"));
        } finally {
            setActionLoading(false);
        }
    }, [actionLoading, profileUser, followStatus, currentUser?._id, getToken, t]);

    const handleConnect = useCallback(async () => {
        setConnectionStatus("sent");
        try {
            const token = await getToken();
            await api.post(
                "/connection/send",
                { receiverId: profileUser._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(t("profile.toasts.requestSent"));
            dispatch(fetchMyConnections(token));
        } catch (error) {
            setConnectionStatus("none");
            toast.error(error.response?.data?.message || t("profile.toasts.failed"));
        }
    }, [profileUser, getToken, dispatch, t]);

    const handleAcceptRequest = useCallback(async () => {
        try {
            const token = await getToken();
            await api.post(
                `/connection/accept/${profileUser._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(t("profile.toasts.connected"));
            setConnectionStatus("connected");
            dispatch(fetchMyConnections(token));
        } catch (error) {
            toast.error(t("profile.toasts.acceptFailed"));
        }
    }, [profileUser, getToken, dispatch, t]);

    const handleRemoveConnection = useCallback(async () => {
        if (!window.confirm(t("profile.toasts.removeConfirm"))) return;

        const previousStatus = connectionStatus;
        setConnectionStatus("none");

        try {
            const token = await getToken();
            await api.put(
                `/connection/remove/${profileUser._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(t("profile.toasts.connectionRemoved"));
            dispatch(fetchMyConnections(token));
        } catch (error) {
            setConnectionStatus(previousStatus);
            toast.error(t("profile.toasts.failed"));
        }
    }, [profileUser, connectionStatus, getToken, dispatch, t]);

    const handleBlockToggle = useCallback(async () => {
        const isBlockedByMe =
            profileUser?.isBlockedByMe ||
            currentUser?.blockedUsers?.some((id) => isSameId(id, profileUser?._id));

        const actionText = isBlockedByMe ? t("profile.actions.unblock") : t("profile.actions.block");
        if (!confirm(t("profile.toasts.blockConfirm", { action: actionText })))
            return;

        try {
            const token = await getToken();
            const endpoint = `/connection/${isBlockedByMe ? "unblock" : "block"}/${profileUser._id}`;
            const { data } = await api.post(
                endpoint,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success(data.message);
                window.location.reload();
            }
        } catch (error) {
            toast.error(t("profile.toasts.failed"));
        }
    }, [profileUser, currentUser, getToken, t]);

    // --- Derived View State ---
    const isBlockedByMe = useMemo(
        () =>
            profileUser?.isBlockedByMe ||
            currentUser?.blockedUsers?.some((id) => isSameId(id, profileUser?._id)),
        [profileUser, currentUser]
    );

    const isBlockedByTarget = profileUser?.isBlockedByTarget;
    const isRestricted = isBlockedByMe || isBlockedByTarget;
    const isPrivateAccount = profileUser?.isPrivate;
    const isContentLocked = !isMyProfile && isPrivateAccount && followStatus !== "following";

    // --- Render ---

    if (loading)
        return (
            <div className="min-h-screen bg-main flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );

    if (!profileUser)
        return (
            <div className="min-h-screen bg-main flex items-center justify-center text-muted">
                {t("profile.userUnavailable")}
            </div>
        );

    return (
        <div className="min-h-screen bg-main text-content pb-20 transition-colors duration-300">
            {/* 1. Hero Section */}
            <div className="relative">
                <ProfileHero
                    profileUser={profileUser}
                    isRestricted={isRestricted}
                    isMyProfile={isMyProfile}
                    onEditClick={handleEditProfile}
                />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20">
                    <div className="relative -mt-24 md:-mt-32 bg-linear-to-b from-surface/80 via-surface/95 to-main backdrop-blur-2xl border border-adaptive rounded-3xl p-6 md:p-8 shadow-2xl">
                        <div className="flex flex-col md:flex-row gap-6 relative z-10">

                            {/* Avatar */}
                            <ProfileAvatar
                                profileUser={profileUser}
                                isRestricted={isRestricted}
                                isMyProfile={isMyProfile}
                                onEditClick={handleEditProfile}
                            />

                            {/* Info & Actions */}
                            <div className="flex-1 flex flex-col md:justify-end pt-2">
                                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-5">

                                    {/* Text Info */}
                                    <ProfileInfo
                                        profileUser={profileUser}
                                        isBlockedByMe={isBlockedByMe}
                                        isBlockedByTarget={isBlockedByTarget}
                                        t={t}
                                    />

                                    {/* Action Buttons */}
                                    <ProfileActions
                                        isMyProfile={isMyProfile}
                                        isBlockedByMe={isBlockedByMe}
                                        isBlockedByTarget={isBlockedByTarget}
                                        profileUser={profileUser}
                                        followStatus={followStatus}
                                        connectionStatus={connectionStatus}
                                        showConnectionMenu={showConnectionMenu}
                                        setShowConnectionMenu={setShowConnectionMenu}
                                        onEdit={handleEditProfile}
                                        onBlock={handleBlockToggle}
                                        onFollow={handleFollowToggle}
                                        onConnect={handleConnect}
                                        onAccept={handleAcceptRequest}
                                        onRemoveConnection={handleRemoveConnection}
                                        onMessage={handleMessage}
                                        t={t}
                                    />
                                </div>

                                {/* Stats & Bio */}
                                {!isRestricted && (
                                    <>
                                        <p className="mt-6 text-content/80 text-sm md:text-base leading-relaxed text-center md:text-start font-medium max-w-3xl mx-auto md:mx-0">
                                            {profileUser.bio || t("profile.noBio")}
                                        </p>
                                        <ProfileStats
                                            postsCount={posts?.length || 0}
                                            profileUser={profileUser}
                                            isContentLocked={isContentLocked}
                                            loading={posts === null || loading || actionLoading}
                                            t={t}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Content Tabs */}
            {!isRestricted && (
                isContentLocked ? (
                    <PrivateAccountState t={t} />
                ) : (
                    <div className="max-w-5xl mx-auto mt-8 px-4">
                        <TabNavigation
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            isMyProfile={isMyProfile}
                            TABS={TABS}
                        />

                        <AnimatePresence mode="wait">
                            {activeTab === "posts" && (
                                <PostsGrid key="posts" posts={posts || []} t={t} />
                            )}

                            {activeTab === "media" && (
                                <MediaGrid
                                    key="media"
                                    posts={posts || []}
                                    onImageClick={handleImageSelect}
                                    t={t}
                                />
                            )}

                            {activeTab === "saved" && isMyProfile && (
                                <SavedGrid
                                    key="saved"
                                    posts={savedPosts}
                                    loading={savedLoading}
                                    t={t}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                )
            )}

            {/* 3. Modals */}
            <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}>
                {showEdit && <UpdateProfileModal setShowEdit={setShowEdit} />}
            </Suspense>

            <ImageModal
                selectedImage={selectedImage}
                onClose={handleCloseImage}
            />
        </div>
    );
};

export default Profile;
