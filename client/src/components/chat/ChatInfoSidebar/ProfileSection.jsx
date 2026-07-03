import React, { memo } from "react";
import { Users, Copy } from "lucide-react";
import UserAvatar from "../../common/UserDefaultAvatar";

export const ProfileSection = memo(({ isGroup, image, name, subtitle, bio, onCopyInfo }) => (
    <div className="flex flex-col items-center justify-center text-center space-y-4 relative">
        <div className="relative group">
            {isGroup ? (
                <img src={image} alt={name} className="w-28 h-28 md:w-32 md:h-32 rounded-3xl object-cover ring-4 ring-surface shadow-2xl" />
            ) : (
                <UserAvatar user={{ profile_picture: image, image }} className="w-28 h-28 md:w-32 md:h-32 shadow-2xl rounded-full ring-4 ring-surface" />
            )}
        </div>

        <div className="w-full">
            <div
                className="relative flex items-center justify-center gap-2 cursor-pointer group"
                onClick={onCopyInfo}
                title="Click to copy name"
            >
                <h3 className="text-2xl font-black text-content tracking-tight group-hover:text-primary transition-colors">{name}</h3>
                <Copy size={16} className="absolute end-0 text-muted opacity-0 group-hover:opacity-100 transition-all" />
            </div>

            <p className="text-muted text-sm font-medium flex items-center justify-center gap-1.5 mt-1">
                {isGroup ? <Users size={14} className="text-primary" /> : "@"}
                {subtitle}
            </p>
        </div>

        {bio && (
            <div className="bg-main/50 p-3 rounded-xl border border-adaptive w-full">
                <p className="text-sm text-content/80 italic leading-relaxed">"{bio}"</p>
            </div>
        )}
    </div>
));

ProfileSection.displayName = "ProfileSection";

export default ProfileSection;
