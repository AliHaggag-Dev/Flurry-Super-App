import React from 'react';
import { AnimatePresence, motion } from "framer-motion";
import UserAvatar from "../../components/common/UserDefaultAvatar";

const TypingIndicator = ({ isTyping, targetUser }) => (
    <AnimatePresence>
        {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-end gap-2 p-2">
                <div className="w-8 h-8 rounded-full bg-surface border border-adaptive flex items-center justify-center shadow-sm">
                    <UserAvatar user={targetUser} className="w-8 h-8 rounded-full object-cover" />
                </div>
                <div className="bg-surface border border-adaptive rounded-2xl rounded-bl-none p-3 px-4 shadow-sm w-fit">
                    <div className="flex items-center gap-1.5 h-5">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                    </div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default TypingIndicator;
