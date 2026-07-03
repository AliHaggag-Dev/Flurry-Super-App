import React, { memo } from "react";
import { MessageCircle } from "lucide-react";
import CommentItem from "../../components/feed/CommentItem";

const EmptyState = memo(({ icon: Icon, message, t }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-surface/50 rounded-[2rem] border border-adaptive border-dashed">
        <div className="p-5 bg-main rounded-full mb-4 shadow-sm">
            <Icon className="w-10 h-10 text-muted/50" />
        </div>
        <p className="text-content font-bold text-lg">{message}</p>
    </div>
));
EmptyState.displayName = "EmptyState";

const DiscussionSection = memo(({ commentsTree, commentsCount, currentUser, postOwnerId, onAddReply, onLike, onDelete, onEdit, t }) => (
    <div className="space-y-6 pb-4">
        <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] ps-4 border-s-4 border-primary text-start">
            {t("postDetails.discussion", { count: commentsCount })}
        </h3>

        {commentsTree.length === 0 ? (
            <EmptyState icon={MessageCircle} message={t("postDetails.noComments")} />
        ) : (
            <div className="space-y-6">
                {commentsTree.map((rootComment) => (
                    <CommentItem
                        key={rootComment._id}
                        comment={rootComment}
                        currentUser={currentUser}
                        postOwnerId={postOwnerId}
                        addReply={onAddReply}
                        onLike={onLike}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        )}
    </div>
));

DiscussionSection.displayName = "DiscussionSection";

export default DiscussionSection;
