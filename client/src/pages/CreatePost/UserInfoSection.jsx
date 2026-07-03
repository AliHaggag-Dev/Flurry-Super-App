import React, { memo } from "react";
import UserAvatar from "../../components/common/UserDefaultAvatar";

const UserInfoSection = memo(({ user, isLoading, t }) => {
    if (isLoading && !user) {
        return (
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-adaptive/30 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-adaptive/30 rounded animate-pulse"></div>
                    <div className="h-3 w-20 bg-adaptive/30 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 mb-6">
            <UserAvatar user={user} className="w-12 h-12 border rounded-full border-adaptive shadow-md" />
            <div>
                <h3 className="font-bold text-content text-lg">{user?.full_name || t("stories.defaultUser")}</h3>
                <p className="text-xs text-muted font-medium">@{user?.username || "username"}</p>
            </div>
        </div>
    );
});

UserInfoSection.displayName = "UserInfoSection";

export default UserInfoSection;
