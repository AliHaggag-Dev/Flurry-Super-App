import React, { memo } from "react";
import { Image as ImageIcon, FileText, Link2, Video, File, Link } from "lucide-react";

export const EmptyState = memo(({ text, icon: Icon }) => (
    <div className="col-span-3 flex flex-col items-center justify-center py-10 opacity-50">
        <div className="bg-adaptive p-3 rounded-full mb-2">
            <Icon size={20} className="text-muted" />
        </div>
        <p className="text-xs text-muted font-medium">{text}</p>
    </div>
));

EmptyState.displayName = "EmptyState";

export const SharedContentSection = memo(({ activeTab, setActiveTab, sharedMedia, sharedFiles, sharedLinks, t }) => (
    <div className="space-y-4 border-t border-adaptive pt-6">
        <div className="flex bg-main p-1 rounded-xl border border-adaptive">
            {[{ id: "media", icon: ImageIcon, label: t("chatInfo.media") }, { id: "files", icon: FileText, label: t("chatInfo.files") }, { id: "links", icon: Link2, label: t("chatInfo.links") }].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-extrabold rounded-lg transition-all duration-300 ${activeTab === tab.id ? "bg-surface text-primary shadow-sm scale-[1.02]" : "text-muted hover:text-content hover:bg-surface/50"}`}
                >
                    <tab.icon size={14} /> {tab.label}
                </button>
            ))}
        </div>

        <div className="min-h-[150px] max-h-[300px] overflow-y-auto scrollbar-hide">
            {activeTab === "media" && (
                <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {sharedMedia.length > 0 ? sharedMedia.map((msg, index) => (
                        <div key={index} className="aspect-square relative overflow-hidden rounded-xl border border-adaptive cursor-pointer group bg-main" onClick={() => window.open(msg.media_url, "_blank")}>
                            {msg.message_type === "video" ? (
                                <div className="w-full h-full flex items-center justify-center bg-black/10">
                                    <Video size={24} className="text-white/80" />
                                    <video src={msg.media_url} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                </div>
                            ) : (
                                <img src={msg.media_url} alt="media" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            )}
                        </div>
                    )) : <EmptyState text={t("chatInfo.noMedia")} icon={ImageIcon} />}
                </div>
            )}

            {activeTab === "files" && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {sharedFiles.length > 0 ? sharedFiles.map((msg, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border border-adaptive rounded-xl cursor-pointer hover:bg-surface/50">
                            <File size={18} className="text-primary" />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold truncate">{msg.file_name}</p>
                                <p className="text-xs text-muted">{msg.file_size}</p>
                            </div>
                        </div>
                    )) : <EmptyState text={t("chatInfo.noFiles")} icon={FileText} />}
                </div>
            )}

            {activeTab === "links" && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {sharedLinks.length > 0 ? sharedLinks.map((msg, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border border-adaptive rounded-xl cursor-pointer hover:bg-surface/50">
                            <Link size={18} className="text-primary shrink-0" />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold truncate">{msg.link_title || "Link"}</p>
                                <p className="text-xs text-muted truncate">{msg.link_url}</p>
                            </div>
                        </div>
                    )) : <EmptyState text={t("chatInfo.noLinks")} icon={Link2} />}
                </div>
            )}
        </div>
    </div>
));

SharedContentSection.displayName = "SharedContentSection";

export default SharedContentSection;
