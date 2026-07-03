import React, { useEffect, useState, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Hand } from "lucide-react";

const ImageGallery = memo(({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showSwipeHint, setShowSwipeHint] = useState(true);

    useEffect(() => {
        if (initialIndex !== null) setCurrentIndex(initialIndex);
    }, [initialIndex]);

    useEffect(() => {
        const timer = setTimeout(() => setShowSwipeHint(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    const nextImage = useCallback((e) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const prevImage = useCallback((e) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") nextImage();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nextImage, prevImage, onClose]);

    if (initialIndex === null || !images?.length) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
                onClick={onClose}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-6 end-6 z-50 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition active:scale-90"
                >
                    <X size={24} />
                </button>

                {images.length > 1 && (
                    <button
                        onClick={prevImage}
                        className="absolute start-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition hidden sm:block hover:scale-110 rtl:rotate-180"
                    >
                        <ChevronLeft size={32} />
                    </button>
                )}

                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentIndex}
                            src={images[currentIndex]}
                            alt={`Gallery ${currentIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: "linear" }}
                            onClick={(e) => e.stopPropagation()}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={1}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = Math.abs(offset.x) * velocity.x;
                                if (swipe < -10000) nextImage();
                                else if (swipe > 10000) prevImage();
                            }}
                            className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg select-none"
                        />
                    </AnimatePresence>

                    {images.length > 1 && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1 rounded-full text-white text-sm backdrop-blur-md border border-white/10">
                            {currentIndex + 1} / {images.length}
                        </div>
                    )}

                    <AnimatePresence>
                        {showSwipeHint && images.length > 1 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none sm:hidden"
                            >
                                <motion.div
                                    animate={{
                                        x: [0, 50, -50, 0],
                                        opacity: [0, 1, 1, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <Hand size={48} className="text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]" />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {images.length > 1 && (
                    <button
                        onClick={nextImage}
                        className="absolute end-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition hidden sm:block hover:scale-110 rtl:rotate-180"
                    >
                        <ChevronRight size={32} />
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
});

ImageGallery.displayName = "ImageGallery";

export default ImageGallery;
