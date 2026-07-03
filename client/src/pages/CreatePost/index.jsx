/**
 * CreatePost Page
 * ------------------------------------------------------------------
 * A production-grade component for creating posts with text and media.
 */

import React, { useState, useEffect, useRef, useCallback, memo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

// --- Third Party Icons ---
import { Image, Smile, Loader2, UploadCloud, PenTool } from "lucide-react";

// --- API & State Management ---
import api from "../../lib/axios";
import { fetchUser } from "../../features/userSlice";

// --- Subfolder Components ---
import UserInfoSection from "./UserInfoSection";
import ImagePreviewList from "./ImagePreviewList";

// --- Lazy Loading ---
const EmojiPicker = lazy(() => import('emoji-picker-react'));

const CreatePost = () => {
    // --- Hooks & Redux ---
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { currentUser, status } = useSelector((state) => state.user);
    const fileInputRef = useRef(null);
    const { t } = useTranslation();

    // --- Local State ---
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const loadUser = async () => {
            if (!currentUser) {
                try {
                    const token = await getToken();
                    if (token) await dispatch(fetchUser(token)).unwrap();
                } catch (error) {
                    console.error("Failed to load user info");
                }
            }
        };
        loadUser();
    }, [currentUser, dispatch, getToken]);

    // --- Handlers (Memoized) ---

    const handleEmojiClick = useCallback((emojiObject) => {
        setContent(prev => prev + emojiObject.emoji);
    }, []);

    const handleImageChange = useCallback((e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImages((prev) => [...prev, ...filesArray]);
        }
        if (e.target) e.target.value = '';
    }, []);

    const handleRemoveImage = useCallback((index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Drag & Drop Handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filesArray = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            setImages(prev => [...prev, ...filesArray]);
        }
    }, []);

    // Submission Handler
    const handleSubmit = async () => {
        if (content.trim() === "" && images.length === 0) {
            toast.error(t("createPost.emptyError"));
            return;
        }

        setLoading(true);

        const publishPromise = async () => {
            const postType = images.length && content.trim() !== "" ? "text_with_image" : images.length ? "image" : "text";
            const formData = new FormData();
            formData.append("content", content);
            formData.append("post_type", postType);
            images.forEach((image) => formData.append("images", image));

            const token = await getToken();
            const { data } = await api.post("/post/add", formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!data.success) throw new Error("API Error");
            return data;
        };

        toast.promise(publishPromise(), {
            loading: t("createPost.publishing"),
            success: () => {
                navigate("/");
                return t("createPost.success");
            },
            error: t("createPost.error"),
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="min-h-screen bg-main text-content pt-8 pb-20 overflow-x-hidden flex justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-2xl">

                {/* Page Title */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center md:text-start"
                >
                    <h1 className="text-3xl md:text-4xl font-extrabold text-content flex items-center justify-center md:justify-start gap-3">
                        {t("createPost.title")}
                        <PenTool className="text-primary w-8 h-8 md:w-10 md:h-10 animate-bounce" />
                    </h1>
                    <p className="text-muted mt-2 font-medium">{t("createPost.subtitle")}</p>
                </motion.div>

                {/* Content Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-surface/80 backdrop-blur-xl border border-adaptive rounded-3xl p-6 shadow-xl relative overflow-hidden"
                >
                    {/* User Info */}
                    <UserInfoSection user={currentUser} isLoading={status === "loading"} t={t} />

                    {/* Text Area */}
                    <textarea
                        className="w-full min-h-[150px] bg-transparent text-lg text-content placeholder-muted/60 outline-none resize-none p-2 leading-relaxed"
                        placeholder={t("createPost.placeholder")}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={loading}
                        autoFocus
                    />

                    {/* Image Previews */}
                    <ImagePreviewList images={images} onRemove={handleRemoveImage} />

                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`mt-4 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden
                            ${isDragging
                                ? "border-primary bg-primary/5 scale-[1.01]"
                                : "border-adaptive hover:border-primary/50 hover:bg-main"
                            }
                            ${images.length > 0 ? "py-6" : "py-12"}`
                        }
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                        />

                        <div className={`p-4 rounded-full bg-main mb-3 transition-colors ${isDragging ? "bg-primary/10" : "group-hover:bg-surface"}`}>
                            <UploadCloud className={`w-8 h-8 transition-colors ${isDragging ? "text-primary" : "text-muted group-hover:text-primary"}`} />
                        </div>
                        <p className="text-sm text-muted font-bold group-hover:text-content transition-colors z-10">
                            {isDragging ? t("createPost.dropHere") : t("createPost.uploadText")}
                        </p>
                    </div>

                    {/* Toolbar & Submit */}
                    <div className="flex items-center justify-between mt-8 border-t border-adaptive pt-6 relative">
                        <div className="flex gap-3 relative">
                            {/* Image Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-colors border border-transparent hover:border-primary/20"
                                title={t("createPost.addImage")}
                                type="button"
                                disabled={loading}
                            >
                                <Image size={24} />
                            </button>

                            {/* Emoji Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowEmoji(!showEmoji)}
                                    className="p-2.5 text-yellow-500 hover:bg-yellow-500/10 rounded-xl transition-colors border border-transparent hover:border-yellow-500/20"
                                    title={t("createPost.addEmoji")}
                                    type="button"
                                    disabled={loading}
                                >
                                    <Smile size={24} />
                                </button>

                                <AnimatePresence>
                                    {showEmoji && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute top-full start-0 mt-3 z-50 shadow-2xl rounded-2xl overflow-hidden border border-adaptive"
                                        >
                                            <div onClick={() => setShowEmoji(false)} className="fixed inset-0 z-40" />
                                            <div className="relative z-50">
                                                <Suspense fallback={
                                                    <div className="w-[300px] h-[350px] flex items-center justify-center bg-surface">
                                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                    </div>
                                                }>
                                                    <EmojiPicker
                                                        onEmojiClick={handleEmojiClick}
                                                        theme="dark"
                                                        lazyLoadEmojis={true}
                                                        searchDisabled={false}
                                                        skinTonesDisabled={true}
                                                        previewConfig={{ showPreview: false }}
                                                        width={300}
                                                        height={350}
                                                        style={{
                                                            "--epe-bg-color": "rgb(var(--color-surface))",
                                                            "--epe-category-label-bg-color": "rgb(var(--color-main))",
                                                            "--epe-text-color": "rgb(var(--color-content))",
                                                            "--epe-search-border-color": "rgb(var(--color-border))",
                                                            "--epe-search-input-bg-color": "rgb(var(--color-main))",
                                                            "--epe-hover-bg-color": "rgba(var(--color-primary), 0.2)",
                                                            "--epe-focus-bg-color": "rgba(var(--color-primary), 0.4)",
                                                            "--epe-horizontal-padding": "10px",
                                                            "--epe-picker-border-eadius": "16px",
                                                            border: "none"
                                                        }}
                                                    />
                                                </Suspense>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center gap-4">
                            <span className={`text-xs font-bold font-mono transition-colors ${content.length > 280 ? "text-red-500 animate-pulse" : "text-muted"}`}>
                                {content.length}/280
                            </span>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (!content.trim() && images.length === 0)}
                                className="bg-primary hover:opacity-90 text-white font-bold py-2.5 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/25"
                                type="button"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : t("createPost.postBtn")}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default memo(CreatePost);
