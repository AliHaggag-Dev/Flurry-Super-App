import React, { useMemo, memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { CheckCheck, Trash2 } from "lucide-react";
import { getNotificationStyle } from "./utils";

const NotificationItem = memo(({ notification, onRead, onDelete, onClick, t, currentLocale }) => {
    const style = useMemo(() => getNotificationStyle(notification.type), [notification.type]);
    const Icon = style.icon;

    // Local handlers to stop propagation
    const handleRead = (e) => {
        e.stopPropagation();
        onRead(notification._id);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(notification._id);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
            onClick={() => onClick(notification)}
            className={`
                group relative flex items-start gap-4 p-5 rounded-2xl transition-all cursor-pointer border
                ${!notification.read
                    ? "bg-surface shadow-md border-s-4 border-s-primary border-y-adaptive border-e-adaptive"
                    : "bg-main border-transparent opacity-80 hover:opacity-100 hover:bg-surface hover:shadow-sm"
                }
            `}
        >
            {/* Icon Badge & Avatar */}
            <div className="relative shrink-0">
                <div className="relative">
                    <img
                        src={notification.sender?.profile_picture || "/avatar-placeholder.png"}
                        alt="user"
                        className={`w-12 h-12 rounded-full object-cover border-2 transition-transform ${!notification.read ? 'border-primary' : 'border-surface'}`}
                        loading="lazy"
                    />
                    <div className="absolute -bottom-1 -end-1 p-0.5 rounded-full bg-surface border border-adaptive shadow-sm">
                        <div className={`p-1 rounded-full ${style.bg}`}>
                            <Icon className={`w-3 h-3 ${style.color}`} strokeWidth={3} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-sm leading-relaxed pe-8 ${!notification.read ? 'text-content font-semibold' : 'text-muted'}`}>
                    <span className="font-bold hover:underline text-content hover:text-primary transition-colors">
                        {notification.sender?.full_name || t("stories.defaultUser")}
                    </span>
                    <span className="mx-1 font-medium opacity-90">
                        {t(`notifications.types.${notification.type}`)}
                    </span>
                </p>
                {(notification.type === "comment" || notification.type === "reply") && notification.commentId?.text && (
                    <p className="mt-2 text-sm text-muted/90 italic border-s-2 border-primary/30 ps-3 line-clamp-1 bg-main/50 p-1.5 rounded-e-lg">
                        "{notification.commentId.text}"
                    </p>
                )}
                <p className="text-xs text-muted/60 mt-1.5 font-bold flex items-center gap-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: currentLocale })}
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-surface/80 backdrop-blur-sm rounded-full p-1 border border-adaptive sm:shadow-sm">
                    {!notification.read && (
                        <button
                            onClick={handleRead}
                            className="p-1.5 rounded-full hover:bg-main text-muted hover:text-green-500 transition"
                            title={t("notifications.actions.markRead")}
                        >
                            <CheckCheck size={14} />
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-full hover:bg-main text-muted hover:text-red-500 transition"
                        title={t("notifications.actions.delete")}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                {notification.post?.image && (
                    <img
                        src={notification.post.image}
                        alt="post"
                        className="w-12 h-12 rounded-xl object-cover border border-adaptive shadow-sm group-hover:scale-105 transition-transform"
                        loading="lazy"
                    />
                )}
                {!notification.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg animate-pulse mt-auto sm:hidden border border-white/20"></div>
                )}
            </div>
        </motion.div>
    );
});

NotificationItem.displayName = "NotificationItem";

export default NotificationItem;
