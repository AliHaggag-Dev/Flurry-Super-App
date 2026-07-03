import React, { memo } from "react";
import { Loader2, Send } from "lucide-react";
import UserAvatar from "../../components/common/UserDefaultAvatar";

const CommentInput = memo(({
    currentUser, commentText, submitting, textareaRef,
    onInput, onSubmit, t
}) => (
    <div className="fixed bottom-0 start-0 md:start-20 end-0 p-4 bg-gradient-to-t from-main via-main/95 to-transparent z-40">
        <div className="max-w-3xl mx-auto flex items-end gap-3 bg-surface/90 backdrop-blur-xl p-2 rounded-[2rem] border border-adaptive shadow-2xl">
            <div className="shrink-0 mb-1 ms-1">
                <UserAvatar user={currentUser} className="w-9 h-9 border border-adaptive rounded-full" />
            </div>
            <div className="flex-1 bg-main/50 rounded-3xl flex items-center border border-transparent focus-within:border-primary/50 focus-within:bg-main focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
                <textarea
                    ref={textareaRef}
                    value={commentText}
                    onInput={onInput}
                    placeholder={t("postDetails.addComment")}
                    className="w-full bg-transparent text-content py-3 px-4 max-h-32 min-h-11 resize-none focus:outline-none text-[15px] placeholder-muted/70 leading-relaxed custom-scrollbar"
                    rows={1}
                />
                <button
                    onClick={() => onSubmit(commentText, null)}
                    disabled={submitting || !commentText.trim()}
                    className="p-2.5 me-1.5 text-white bg-primary hover:opacity-90 rounded-full disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all shadow-md active:scale-95 self-end mb-1.5"
                >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ms-0.5 rtl:rotate-270" />}
                </button>
            </div>
        </div>
    </div>
));

CommentInput.displayName = "CommentInput";

export default CommentInput;
