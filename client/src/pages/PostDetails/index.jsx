/**
 * PostDetails Page
 * ------------------------------------------------------------------
 * Detailed view of a single post with nested comments system.
 */

import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

// --- Icons ---
import { Loader2 } from "lucide-react";

// --- API & Utils ---
import api from "../../lib/axios";
import { buildCommentTree } from "../../utils/buildCommentTree";

// --- Components ---
import UserAvatar from "../../components/common/UserDefaultAvatar";
import ShareModal from "../../components/modals/ShareModal";
import EditPostModal from "../../components/modals/EditPostModal";
import ReportModal from "../../components/modals/ReportModal";

// --- Subfolder Components ---
import PostHeader from "./PostHeader";
import PostMedia from "./PostMedia";
import StatsBar from "./StatsBar";
import CommentInput from "./CommentInput";
import ImageGallery from "./ImageGallery";
import DiscussionSection from "./DiscussionSection";

const getFamilyIds = (parentId, allComments) => {
    let ids = [parentId];
    const children = allComments.filter(c => c.parentId === parentId);
    children.forEach(child => { ids = [...ids, ...getFamilyIds(child._id, allComments)]; });
    return ids;
};

const PostDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken, userId } = useAuth();
    const { currentUser } = useSelector((state) => state.user);
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // --- State ---
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isSaved, setIsSaved] = useState(false);

    // Modals & Menus
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [showInternalShareModal, setShowInternalShareModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Image Lightbox
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    // Ref for textarea auto-growth
    const textareaRef = useRef(null);

    // --- Fetch Logic ---
    const fetchPostDetails = useCallback(async () => {
        try {
            const token = await getToken();
            const { data } = await api.get(`/post/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setPost(data.data.post);
                setComments(data.data.comments || []);
                setIsSaved(data.data.isSaved);
            } else {
                toast.error(t("postDetails.notFound"));
                navigate(-1);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(t("postDetails.fetchFailed"));
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }, [id, getToken, navigate, t]);

    useEffect(() => {
        fetchPostDetails();
    }, [fetchPostDetails]);

    // --- Auto-resize input textarea ---
    const handleTextareaInput = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, []);

    // Reset height on state submit/clear
    useEffect(() => {
        if (commentText === "" && textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [commentText]);

    // --- Memoized Comment Tree ---
    const commentsTree = useMemo(() => buildCommentTree(comments), [comments]);
    const commentsCount = useMemo(() => comments.length, [comments]);

    // --- Social Interactions & Options ---

    const handleCopyLink = useCallback(() => {
        const link = `${window.location.origin}/post/${id}`;
        navigator.clipboard.writeText(link);
        toast.success(t("post.linkCopied"));
        setShowOptionsMenu(false);
    }, [id, t]);

    const handleSavePost = useCallback(async () => {
        const oldState = isSaved;
        setIsSaved(!oldState); // Optimistic UI
        setShowOptionsMenu(false);

        try {
            const token = await getToken();
            await api.put(`/post/save/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(oldState ? t("post.toasts.unsaved") : t("post.toasts.saved"));
        } catch (error) {
            setIsSaved(oldState); // Revert
            toast.error(t("profile.toasts.actionFailed"));
        }
    }, [id, isSaved, getToken, t]);

    const handleDeletePost = useCallback(async () => {
        if (!window.confirm(t("post.toasts.deleteConfirm"))) return;
        setShowOptionsMenu(false);

        const deletePromise = async () => {
            const token = await getToken();
            await api.delete(`/post/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        };

        toast.promise(deletePromise(), {
            loading: t("post.toasts.deleting"),
            success: () => {
                navigate(-1);
                return t("post.toasts.deleted");
            },
            error: t("profile.toasts.actionFailed")
        });
    }, [id, getToken, navigate, t]);

    const handleExternalShare = useCallback(async () => {
        setShowShareMenu(false);
        const shareData = {
            title: post?.content || "Social Post",
            text: post?.content || "",
            url: `${window.location.origin}/post/${id}`
        };

        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                await api.post(`/post/share/${id}`, {}, {
                    headers: { Authorization: `Bearer ${await getToken()}` }
                });
            } catch (err) {
                if (err.name !== "AbortError") toast.error(t("post.toasts.sharingFailed"));
            }
        } else {
            handleCopyLink();
        }
    }, [id, post, getToken, handleCopyLink]);

    // --- Comment Submission & Reply Actions ---

    const handleCommentSubmit = useCallback(async (text, parentId = null) => {
        if (!text.trim()) return;
        setSubmitting(true);

        try {
            const token = await getToken();
            const { data } = await api.post(`/comment/add`, {
                postId: id,
                text: text.trim(),
                parentId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                const newComment = {
                    ...data.comment,
                    user: {
                        _id: currentUser._id,
                        full_name: currentUser.full_name,
                        profile_picture: currentUser.profile_picture || currentUser.image,
                        username: currentUser.username
                    }
                };

                setComments(prev => [newComment, ...prev]);
                if (!parentId) setCommentText("");
                toast.success(t("comment.toasts.added"));
            }
        } catch (error) {
            toast.error(t("comment.toasts.failed"));
        } finally {
            setSubmitting(false);
        }
    }, [id, currentUser, getToken, t]);

    const handleCommentLike = useCallback(async (commentId) => {
        const commentToLike = comments.find(c => c._id === commentId);
        if (!commentToLike) return;

        const isLiked = commentToLike.likes?.includes(currentUser._id);
        const updatedLikes = isLiked
            ? commentToLike.likes.filter(id => id !== currentUser._id)
            : [...(commentToLike.likes || []), currentUser._id];

        // Optimistic State Update
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, likes: updatedLikes } : c));

        try {
            const token = await getToken();
            await api.put(`/comment/like/${commentId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            // Revert on API Failure
            setComments(prev => prev.map(c => c._id === commentId ? { ...c, likes: commentToLike.likes } : c));
        }
    }, [comments, currentUser?._id, getToken]);

    const handleCommentDelete = useCallback(async (commentId) => {
        if (!window.confirm(t("comment.toasts.deleteConfirm"))) return;

        const idsToDelete = getFamilyIds(commentId, comments);
        const previousComments = [...comments];

        // Optimistic Delete
        setComments(prev => prev.filter(c => !idsToDelete.includes(c._id)));

        try {
            const token = await getToken();
            await api.delete(`/comment/${commentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(t("comment.toasts.deleted"));
        } catch (error) {
            // Revert
            setComments(previousComments);
            toast.error(t("comment.toasts.deleteFailed"));
        }
    }, [comments, getToken, t]);

    const handleCommentEdit = useCallback(async (commentId, newText) => {
        if (!newText.trim()) return;
        const previousComments = [...comments];

        // Optimistic Update
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, text: newText.trim(), isEdited: true } : c));

        try {
            const token = await getToken();
            await api.put(`/comment/edit/${commentId}`, { text: newText.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            setComments(previousComments);
            toast.error(t("profile.toasts.actionFailed"));
        }
    }, [comments, getToken, t]);

    // --- Modal callbacks ---
    const handleReportSubmit = useCallback(() => {
        setShowReportModal(false);
        toast.success(t("post.toasts.reported"));
    }, [t]);

    const handleEditPostSuccess = useCallback((updatedPost) => {
        setPost(prev => ({ ...prev, ...updatedPost }));
        setShowEditModal(false);
    }, []);

    // --- Image Lighbox Navigation ---
    const handleSelectImage = useCallback((index) => setSelectedImageIndex(index), []);
    const handleCloseImage = useCallback(() => setSelectedImageIndex(null), []);

    // --- Core Renders ---

    if (loading) {
        return (
            <div className="min-h-screen bg-main flex items-center justify-center sm:ms-20 transition-all duration-300">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-main flex items-center justify-center text-muted sm:ms-20">
                {t("postDetails.notFound")}
            </div>
        );
    }

    const isOwner = post.user?._id === currentUser?._id;

    return (
        <div className="min-h-screen bg-main text-content relative pb-32 sm:ms-20 transition-all duration-300">
            <PostHeader
                navigate={navigate}
                post={post}
                isOwner={isOwner}
                isSaved={isSaved}
                showOptionsMenu={showOptionsMenu}
                setShowOptionsMenu={setShowOptionsMenu}
                onCopyLink={handleCopyLink}
                onSave={handleSavePost}
                onDelete={handleDeletePost}
                onEdit={() => { setShowOptionsMenu(false); setShowEditModal(true); }}
                onReport={() => { setShowOptionsMenu(false); setShowReportModal(true); }}
                t={t}
            />

            <div className="max-w-3xl mx-auto px-4 pt-6 space-y-8">
                {/* Post Container */}
                <article className="bg-surface/55 backdrop-blur-md p-6 rounded-[2rem] border border-adaptive shadow-sm space-y-4">
                    {/* User Metadata */}
                    <div className="flex items-center gap-4">
                        <UserAvatar user={post.user} className="w-12 h-12 border border-adaptive rounded-full shadow-sm" />
                        <div className="text-start">
                            <h2 className="font-extrabold text-content text-base leading-tight">
                                {post.user?.full_name || t("stories.defaultUser")}
                            </h2>
                            <p className="text-xs text-muted/80 font-bold mt-0.5">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: currentLocale })}
                            </p>
                        </div>
                    </div>

                    {/* Content Text */}
                    <p className="text-content/95 text-[15px] leading-relaxed whitespace-pre-wrap text-start font-medium leading-7 pt-2">
                        {post.content}
                    </p>

                    {/* Media grid display */}
                    <PostMedia images={post.image_urls} onSelectImage={handleSelectImage} />

                    {/* Likes Count & Sharing Section */}
                    <StatsBar
                        commentsCount={commentsCount}
                        sharesCount={post.shares_count || 0}
                        showShareMenu={showShareMenu}
                        setShowShareMenu={setShowShareMenu}
                        setShowInternalShareModal={setShowInternalShareModal}
                        onExternalShare={handleExternalShare}
                        t={t}
                    />
                </article>

                {/* Discussions Feed */}
                <DiscussionSection
                    commentsTree={commentsTree}
                    commentsCount={commentsCount}
                    currentUser={currentUser}
                    postOwnerId={post.user?._id}
                    onAddReply={handleCommentSubmit}
                    onLike={handleCommentLike}
                    onDelete={handleCommentDelete}
                    onEdit={handleCommentEdit}
                    t={t}
                />
            </div>

            {/* Comment Floating Input Bar */}
            <CommentInput
                currentUser={currentUser}
                commentText={commentText}
                submitting={submitting}
                textareaRef={textareaRef}
                onInput={handleTextareaInput}
                onSubmit={handleCommentSubmit}
                t={t}
            />

            {/* Modals & Overlays */}
            <ShareModal isOpen={showInternalShareModal} onClose={() => setShowInternalShareModal(false)} postId={id} />
            {isOwner && <EditPostModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} post={post} onUpdate={handleEditPostSuccess} />}
            <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} targetType="post" targetId={id} onSubmit={handleReportSubmit} />

            {/* Full Screen Image Lightbox */}
            <ImageGallery images={post.image_urls} initialIndex={selectedImageIndex} onClose={handleCloseImage} />
        </div>
    );
};

export default memo(PostDetails);
