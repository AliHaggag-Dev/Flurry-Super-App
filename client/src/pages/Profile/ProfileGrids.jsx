import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Grid, Image, Bookmark, Maximize2, Loader2, Lock } from "lucide-react";
import PostCard from "../../components/feed/PostCard";

export const EmptyState = memo(({ icon: Icon, message, subtext }) => (
    <div className="py-20 text-center text-muted w-full">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-adaptive">
            <Icon size={40} className="text-muted" />
        </div>
        <p className="font-medium text-lg text-content">{message}</p>
        {subtext && <p className="text-sm mt-2 opacity-70 text-muted">{subtext}</p>}
    </div>
));

EmptyState.displayName = "EmptyState";

export const PostsGrid = memo(({ posts, t }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 flex flex-col items-center w-full"
    >
        {posts.length > 0 ? (
            posts.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
            <EmptyState icon={Grid} message={t("profile.empty.posts")} />
        )}
    </motion.div>
));

PostsGrid.displayName = "PostsGrid";

export const MediaGrid = memo(({ posts, onImageClick, t }) => {
    const images = useMemo(() =>
        posts.filter((p) => p.image_urls?.length > 0).flatMap((p) => p.image_urls),
        [posts]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-3 gap-0.5 md:gap-4 w-full"
        >
            {images.length > 0 ? (
                images.map((url, i) => (
                    <div
                        key={`${url}-${i}`}
                        onClick={() => onImageClick(url)}
                        className="aspect-square bg-surface overflow-hidden group cursor-pointer relative rounded-md border border-adaptive/30"
                    >
                        <img
                            src={url}
                            alt="media"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="text-white transform scale-75 group-hover:scale-100 transition-transform" />
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-3">
                    <EmptyState icon={Image} message={t("profile.empty.media")} />
                </div>
            )}
        </motion.div>
    );
});

MediaGrid.displayName = "MediaGrid";

export const SavedGrid = memo(({ posts, loading, t }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 flex flex-col items-center w-full"
    >
        {loading ? (
            <div className="py-12 flex flex-col items-center text-muted">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
                <p className="font-medium">{t("profile.loadingSaved")}</p>
            </div>
        ) : posts.length > 0 ? (
            posts.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
            <EmptyState
                icon={Bookmark}
                message={t("profile.empty.savedTitle")}
                subtext={t("profile.empty.savedDesc")}
            />
        )}
    </motion.div>
));

SavedGrid.displayName = "SavedGrid";

export const PrivateAccountState = memo(({ t }) => (
    <div className="max-w-5xl mx-auto mt-16 px-4 text-center pb-20">
        <div className="bg-surface/50 border border-adaptive rounded-3xl p-12 flex flex-col items-center justify-center shadow-sm max-w-lg mx-auto">
            <div className="w-24 h-24 bg-main rounded-full flex items-center justify-center mb-6 border-2 border-adaptive">
                <Lock size={40} className="text-content opacity-70" />
            </div>
            <h3 className="text-2xl font-bold text-content mb-3">{t("profile.private.title")}</h3>
            <p className="text-muted font-medium">{t("profile.private.desc")}</p>
        </div>
    </div>
));

PrivateAccountState.displayName = "PrivateAccountState";

export const TabNavigation = memo(({ activeTab, setActiveTab, isMyProfile, TABS }) => (
    <div className="flex justify-center border-b border-adaptive mb-8 sticky top-0 bg-main/95 backdrop-blur-xl z-30 pt-2 transition-colors duration-300">
        {TABS.map((tab) => {
            if (tab.private && !isMyProfile) return null;
            return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 md:px-10 pb-3 text-sm font-bold tracking-wide transition-all relative ${activeTab === tab.id ? "text-primary" : "text-muted hover:text-content"
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <tab.icon size={18} /> {tab.label}
                    </span>
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 start-0 w-full h-0.5 bg-primary shadow-[0_0_10px_var(--color-primary)]"
                        />
                    )}
                </button>
            );
        })}
    </div>
));

TabNavigation.displayName = "TabNavigation";
