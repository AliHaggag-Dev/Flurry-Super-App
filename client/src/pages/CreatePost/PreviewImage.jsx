import React, { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const PreviewImage = memo(({ file, onRemove, index }) => {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    if (!previewUrl) return <div className="w-full h-full bg-surface animate-pulse" />;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="relative aspect-square group rounded-xl overflow-hidden shadow-sm border border-adaptive"
        >
            <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
                onClick={() => onRemove(index)}
                className="absolute top-2 end-2 bg-red-500 hover:bg-red-600 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 shadow-lg"
                type="button"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
});

PreviewImage.displayName = "PreviewImage";

export default PreviewImage;
