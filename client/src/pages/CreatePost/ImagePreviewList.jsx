import React, { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PreviewImage from "./PreviewImage";

const ImagePreviewList = memo(({ images, onRemove }) => {
    if (images.length === 0) return null;

    return (
        <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 mb-4"
        >
            <AnimatePresence mode="popLayout">
                {images.map((img, index) => (
                    <PreviewImage
                        key={`${img.name}-${img.lastModified}-${index}`}
                        file={img}
                        index={index}
                        onRemove={onRemove}
                    />
                ))}
            </AnimatePresence>
        </motion.div>
    );
});

ImagePreviewList.displayName = "ImagePreviewList";

export default ImagePreviewList;
