import {
    Heart,
    MessageCircle,
    Share2,
    Bell,
    UserPlus,
    Reply,
    CheckCheck
} from "lucide-react";

export const getNotificationStyle = (type) => {
    switch (type) {
        case "like": return { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10" };
        case "comment": return { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10" };
        case "reply": return { icon: Reply, color: "text-indigo-500", bg: "bg-indigo-500/10" };
        case "share": return { icon: Share2, color: "text-orange-500", bg: "bg-orange-500/10" };
        case "follow": return { icon: UserPlus, color: "text-green-500", bg: "bg-green-500/10" };
        case "connection_accept": return { icon: CheckCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" };
        case "follow_accept": return { icon: CheckCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" };
        default: return { icon: Bell, color: "text-muted", bg: "bg-surface" };
    }
};
