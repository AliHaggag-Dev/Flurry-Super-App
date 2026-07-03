import React, { memo } from "react";
import { optimizeImage } from "../../../utils/imageOptimizer";

export const PostMediaGrid = memo(({ images, priority }) => {
    if (!images || images.length === 0) return null;

    const count = images.length;

    // Common Image Props
    const Img = ({ src, className, size = 400 }) => (
        <img
            src={optimizeImage(src, size)}
            alt="Post content"
            className={`w-full h-full object-cover group-hover:scale-105 transition duration-700 ${className}`}
            loading={priority ? "eager" : "lazy"}
        />
    );

    return (
        <div className="rounded-2xl overflow-hidden border border-adaptive bg-main mt-3">
            {count === 1 && (
                <div className="w-full h-auto overflow-hidden cursor-zoom-in group">
                    <Img src={images[0]} size={600} className="max-h-[600px]" />
                </div>
            )}

            {count === 2 && (
                <div className="grid grid-cols-2 gap-0.5 h-[300px]">
                    {images.map((img, i) => (
                        <div key={i} className="overflow-hidden cursor-pointer h-full group">
                            <Img src={img} />
                        </div>
                    ))}
                </div>
            )}

            {count === 3 && (
                <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-[400px]">
                    <div className="overflow-hidden cursor-pointer h-full group">
                        <Img src={images[0]} />
                    </div>
                    <div className="overflow-hidden cursor-pointer h-full group">
                        <Img src={images[1]} />
                    </div>
                    <div className="col-span-2 overflow-hidden cursor-pointer h-full group">
                        <Img src={images[2]} size={600} />
                    </div>
                </div>
            )}

            {count >= 4 && (
                <div className="grid grid-cols-2 gap-0.5 h-[400px]">
                    {images.slice(0, 4).map((img, i) => (
                        <div key={i} className="relative overflow-hidden cursor-pointer h-full group">
                            <Img src={img} size={300} />
                            {i === 3 && count > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="text-white text-xl font-bold">+{count - 4}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

PostMediaGrid.displayName = "PostMediaGrid";

export default PostMediaGrid;
