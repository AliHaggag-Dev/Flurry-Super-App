import React, { memo } from "react";
import { motion } from "framer-motion";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🙏"];

export const ReactionPicker = memo(({ isMe, onSelect, onClose }) => (
    <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: -50 }}
        exit={{ scale: 0.5, opacity: 0, y: 10 }}
        className={`absolute ${isMe ? "end-0" : "start-0"} top-1/2 -translate-y-1/2 bg-surface/95 backdrop-blur-xl border border-adaptive/50 rounded-full p-1.5 flex items-center gap-1 shadow-2xl z-50 whitespace-nowrap`}
        onClick={(e) => e.stopPropagation()}
    >
        {REACTIONS.map((emoji) => (
            <button
                key={emoji}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(emoji);
                }}
                className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer rounded-full active:scale-95 hover:bg-white/10"
            >
                {emoji}
            </button>
        ))}
    </motion.div>
));

ReactionPicker.displayName = "ReactionPicker";

export default ReactionPicker;
