import React, { memo } from "react";
import { Maximize2 } from "lucide-react";

const PostMedia = memo(({ images, onSelectImage }) => {
    if (!images?.length) return null;
    return (
        <div className={`grid gap-2 rounded-2xl overflow-hidden mt-3 mb-5 border border-adaptive ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {images.map((img, idx) => (
                <div
                    key={idx}
                    onClick={() => onSelectImage(idx)}
                    className={`relative group cursor-pointer overflow-hidden bg-main ${(images.length % 2 !== 0 && idx === images.length - 1) ? 'col-span-2 h-[400px]' : 'h-64 sm:h-80'}`}
                >
                    <img
                        src={img}
                        alt={`img-${idx}`}
                        loading={idx === 0 ? "eager" : "lazy"}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="p-3 bg-white/20 rounded-full border border-white/30 backdrop-blur-md">
                            <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

PostMedia.displayName = "PostMedia";

export default PostMedia;
