import React, { useState, useEffect, useCallback, memo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

// --- API ---
import api from "../../../lib/axios";

// --- Sub-Components ---
import PostHeader from "./PostHeader";
import PostMediaGrid from "./PostMediaGrid";
import PostFooter from "./PostFooter";

// --- Lazy Loaded Modals ---
const ShareModal = lazy(() => import("../../modals/ShareModal"));
const EditPostModal = lazy(() => import("../../modals/EditPostModal"));
const ReportModal = lazy(() => import("../../modals/ReportModal"));

const PostCard = ({ post: initialPost, onDelete, priority, onReport }) => {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { currentUser } = useSelector((state) => state.user);
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // --- State ---
    const [post, setPost] = useState(initialPost);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes?.length || post.likes_count || 0);
    const [isSaved, setIsSaved] = useState(post.saves?.includes(currentUser?._id) || post.isSaved || false);
    const [hasReported, setHasReported] = useState(post.reports?.includes(currentUser?._id) || post.hasReported || false);

    // Option Menus & Share
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Sync state if initialPost updates externally
    useEffect(() => {
        setPost(initialPost);
        setLikesCount(initialPost.likes?.length || initialPost.likes_count || 0);
        setIsSaved(initialPost.saves?.includes(currentUser?._id) || initialPost.isSaved || false);
        setHasReported(initialPost.reports?.includes(currentUser?._id) || initialPost.hasReported || false);
    }, [initialPost, currentUser]);

    // Check if liked, saved, or reported by current user
    useEffect(() => {
        if (currentUser) {
            if (post.likes) {
                setIsLiked(post.likes.includes(currentUser._id));
            }
            if (post.saves) {
                setIsSaved(post.saves.includes(currentUser._id));
            }
            if (post.reports) {
                setHasReported(post.reports.includes(currentUser._id));
            }
        }
    }, [currentUser, post.likes, post.saves, post.reports]);

    // --- Interactions (Memoized) ---

    const handleLike = useCallback(async (e) => {
        e.stopPropagation();
        const oldState = isLiked;
        const oldCount = likesCount;

        // Optimistic UI update
        setIsLiked(!oldState);
        setLikesCount(prev => oldState ? prev - 1 : prev + 1);

        try {
            const token = await getToken();
            const { data } = await api.put(`/post/like/${post._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setLikesCount(data.likes_count ?? data.likes?.length ?? 0);
            }
        } catch (error) {
            // Revert on error
            setIsLiked(oldState);
            setLikesCount(oldCount);
            toast.error(t("profile.toasts.actionFailed"));
        }
    }, [post._id, isLiked, likesCount, getToken, t]);

    const handleCopyLink = useCallback((e) => {
        e.stopPropagation();
        const link = `${window.location.origin}/post/${post._id}`;
        navigator.clipboard.writeText(link);
        toast.success(t("post.linkCopied"));
        setShowOptionsMenu(false);
    }, [post._id, t]);

    const handleSavePost = useCallback(async (e) => {
        e.stopPropagation();
        const oldState = isSaved;
        setIsSaved(!oldState);
        setShowOptionsMenu(false);

        try {
            const token = await getToken();
            await api.put(`/post/save/${post._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(oldState ? t("post.toasts.unsaved") : t("post.toasts.saved"));
        } catch (error) {
            setIsSaved(oldState);
            toast.error(t("profile.toasts.actionFailed"));
        }
    }, [post._id, isSaved, getToken, t]);

    const handleExternalShare = useCallback(async (e) => {
        e.stopPropagation();
        setShowShareMenu(false);
        const shareData = {
            title: post.content || "Flurry Post",
            text: post.content || "",
            url: `${window.location.origin}/post/${post._id}`
        };

        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                const token = await getToken();
                await api.post(`/post/share/${post._id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                if (err.name !== "AbortError") toast.error(t("post.toasts.sharingFailed"));
            }
        } else {
            handleCopyLink(e);
        }
    }, [post._id, post.content, getToken, handleCopyLink]);

    const handleDeletePost = useCallback(async (e) => {
        e.stopPropagation();
        if (!window.confirm(t("post.toasts.deleteConfirm"))) return;

        try {
            const token = await getToken();
            await api.delete(`/post/${post._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(t("post.toasts.deleted"));
            if (onDelete) onDelete(post._id);
        } catch (error) {
            toast.error(t("profile.toasts.actionFailed"));
        }
    }, [post._id, getToken, onDelete, t]);

    const handleReportSubmit = useCallback(() => {
        setHasReported(true);
        setShowReportModal(false);
        if (onReport) onReport(post._id);
        toast.success(t("post.reportedSuccess"));
    }, [post._id, onReport, t]);

    const handleEditPostSuccess = useCallback((updatedPost) => {
        setPost(prev => ({ ...prev, ...updatedPost }));
        setShowEditModal(false);
    }, []);

    const handleNavigatePost = useCallback(() => {
        navigate(`/post/${post._id}`);
    }, [navigate, post._id]);

    const handleNavigateProfile = useCallback(() => {
        navigate(`/profile/${post.user?._id}`);
    }, [navigate, post.user?._id]);

    const handleStorySeen = useCallback(() => {
        // Triggered when closeStory inside UserAvatar triggers
    }, []);

    const handleInternalShareClick = useCallback((e) => {
        e.stopPropagation();
        setShowShareMenu(false);
        setShowShareModal(true);
    }, []);

    const isOwner = post.user?._id === currentUser?._id;

    return (
        <article
            onClick={handleNavigatePost}
            className="bg-surface hover:bg-surface/85 border border-adaptive hover:border-primary/20 rounded-3xl p-5 md:p-6 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer relative"
        >
            {/* Header */}
            <PostHeader
                user={post.user}
                timestamp={post.createdAt}
                locale={currentLocale}
                isOwner={isOwner}
                isSaved={isSaved}
                hasReported={hasReported}
                showOptionsMenu={showOptionsMenu}
                setShowOptionsMenu={setShowOptionsMenu}
                onNavigateProfile={handleNavigateProfile}
                onStorySeen={handleStorySeen}
                onCopyLink={handleCopyLink}
                onSave={handleSavePost}
                onEdit={(e) => { e.stopPropagation(); setShowOptionsMenu(false); setShowEditModal(true); }}
                onDelete={handleDeletePost}
                onReport={() => setShowReportModal(true)}
                t={t}
            />

            {/* Post Content */}
            {post.content && (
                <p className="text-content/95 text-[15px] font-medium leading-relaxed whitespace-pre-wrap text-start mt-2">
                    {post.content}
                </p>
            )}

            {/* Media Gallery Grid */}
            <PostMediaGrid images={post.image_urls} priority={priority} />

            {/* Footer Interactions */}
            <PostFooter
                likesCount={likesCount}
                commentsCount={post.comments?.length || post.comments_count || 0}
                sharesCount={post.shares?.length || post.shares_count || 0}
                isLiked={isLiked}
                showShareMenu={showShareMenu}
                setShowShareMenu={setShowShareMenu}
                onLike={handleLike}
                onNavigatePost={handleNavigatePost}
                onInternalShareClick={handleInternalShareClick}
                onExternalShare={handleExternalShare}
                t={t}
            />

            {/* Lazy Modals wrapper */}
            <Suspense fallback={null}>
                {showShareModal && (
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        postId={post._id}
                    />
                )}
                {showEditModal && (
                    <EditPostModal
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        post={post}
                        onUpdate={handleEditPostSuccess}
                    />
                )}
                {showReportModal && (
                    <ReportModal
                        isOpen={showReportModal}
                        onClose={() => setShowReportModal(false)}
                        targetType="post"
                        targetId={post._id}
                        onSubmit={handleReportSubmit}
                    />
                )}
            </Suspense>
        </article>
    );
};

export default memo(PostCard);
