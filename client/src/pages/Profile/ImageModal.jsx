import React, { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export const ImageModal = memo(({ selectedImage, onClose }) => (
    <AnimatePresence>
        {selectedImage && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                onClick={onClose}
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 end-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-50 backdrop-blur-md"
                >
                    <X size={24} />
                </button>
                <motion.img
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    src={selectedImage}
                    alt="Full Screen"
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </motion.div>
        )}
    </AnimatePresence>
));

ImageModal.displayName = "ImageModal";

export default ImageModal;
