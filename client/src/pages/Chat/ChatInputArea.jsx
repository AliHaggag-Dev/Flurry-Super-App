import React, { lazy, Suspense, memo } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { Send, Image as ImageIcon, Mic, Loader2, Smile, Trash2, StopCircle, Pause, Play, X, Check } from "lucide-react";

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const ChatInputArea = memo((props) => {
    const {
        newMessage, setNewMessage, sendMessage, isChatDisabled, isConnected, isBlockedByMe, targetUserId,
        navigate, showEmoji, setShowEmoji, onEmojiClick, fileInputRef, handleImageSelect,
        startRecording, isRecording, recordingDuration, stopRecording, cancelRecording,
        audioBlob, audioUrl, isPlayingPreview, setIsPlayingPreview, audioPreviewRef,
        previewTime, setPreviewTime, previewDuration, setPreviewDuration,
        selectedImage, imagePreview, setSelectedImage, setImagePreview,
        replyTo, setReplyTo, editingMessage, cancelEdit, t, formatDuration
    } = props;

    return (
        <div className="bg-surface p-2 md:p-3 border-t border-adaptive shrink-0 z-30 transition-all relative">
            {/* Reply Preview */}
            <AnimatePresence>
                {replyTo && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex items-center justify-between bg-main p-3 rounded-t-xl border-b border-adaptive mb-2">
                            <div className="overflow-hidden border-s-4 border-primary ps-2">
                                <span className="text-primary text-xs font-bold block mb-1">{t("chat.replyingTo")} {replyTo.sender?.full_name || t("stories.defaultUser")}</span>
                                <span className="text-muted text-xs truncate block">{replyTo.message_type === 'image' ? t("messages.photo") : replyTo.message_type === 'audio' ? t("messages.voice") : replyTo.text}</span>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-surface rounded-full transition text-muted hover:text-content"><X size={16} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Preview */}
            <AnimatePresence>
                {imagePreview && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="flex items-center gap-3 bg-main p-3 rounded-xl mb-3 border border-adaptive shadow-sm">
                        <img src={imagePreview} alt="preview" className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex-1"><p className="text-content text-sm font-medium">{t("chat.imageSelected")}</p><p className="text-muted text-xs">{t("chat.readyToSend")}</p></div>
                        <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition"><Trash2 size={18} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* State Handling: Disabled / Offline / Active */}
            {isChatDisabled ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-surface/50 backdrop-blur-sm">
                    {isBlockedByMe ? <div className="text-center"><h3 className="text-content font-bold">{t("chat.youBlocked")}</h3></div> : <div className="text-center opacity-80"><h3 className="text-muted font-semibold">{t("chat.conversationClosed")}</h3></div>}
                </div>
            ) : !isConnected ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 bg-surface/50 backdrop-blur-sm">
                    <h3 className="text-content font-bold text-sm">{t("chat.notConnected")}</h3>
                    <button onClick={() => navigate(`/profile/${targetUserId}`)} className="px-5 py-1.5 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary/90 transition">{t("chat.goToProfile")}</button>
                </div>
            ) : (
                <>
                    {showEmoji && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowEmoji(false)}>
                            <div className="relative bg-surface rounded-2xl shadow-2xl border border-adaptive" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setShowEmoji(false)} className="absolute -top-3 -end-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md z-50 transition-transform hover:scale-110"><X size={16} strokeWidth={3} /></button>
                                <Suspense fallback={<div className="w-[350px] h-[450px] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
                                    <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" lazyLoadEmojis={true} previewConfig={{ showPreview: false }} width={350} height={450} style={{ "--epe-bg-color": "rgb(var(--color-surface))", "--epe-category-label-bg-color": "rgb(var(--color-main))", "--epe-text-color": "rgb(var(--color-content))", "--epe-search-border-color": "rgb(var(--color-border))", "--epe-search-input-bg-color": "rgb(var(--color-main))", "--epe-hover-bg-color": "rgba(var(--color-primary), 0.2)", "--epe-focus-bg-color": "rgba(var(--color-primary), 0.4)", "--epe-horizontal-padding": "10px", "--epe-picker-border-eadius": "16px", border: "none" }} />
                                </Suspense>
                            </div>
                        </div>
                    )}

                    {editingMessage && (
                        <div className="flex items-center justify-between bg-surface/80 px-4 py-2 border-t border-primary/20 text-xs text-primary"><span>Editing message...</span><button onClick={cancelEdit} className="text-muted hover:text-content"><X size={14} /></button></div>
                    )}

                    <form onSubmit={sendMessage} className="flex items-center gap-2 md:gap-3 max-w-5xl mx-auto w-full">
                        <div className="flex-1 bg-main rounded-3xl border border-adaptive focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300 shadow-sm relative overflow-hidden min-h-[50px] flex items-center">
                            {isRecording ? (
                                <div className="w-full h-full flex items-center px-4 bg-red-500/5 animate-pulse text-red-500 justify-between">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-ping" /><span className="font-mono font-bold">{formatDuration(recordingDuration)}</span></div>
                                    <div className="flex items-center gap-2"><button type="button" onClick={cancelRecording} className="p-2 hover:bg-red-100 rounded-full text-muted hover:text-red-500 transition"><Trash2 size={20} /></button><button type="button" onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"><StopCircle size={20} /></button></div>
                                </div>
                            ) : audioBlob ? (
                                <div className="w-full h-full flex items-center px-3 justify-between gap-3">
                                    <button type="button" onClick={() => { if (audioPreviewRef.current) { if (isPlayingPreview) audioPreviewRef.current.pause(); else audioPreviewRef.current.play(); setIsPlayingPreview(!isPlayingPreview); } }} className="w-9 h-9 flex items-center justify-center bg-primary text-white rounded-full hover:scale-105 transition shrink-0 shadow-sm">{isPlayingPreview ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ms-0.5" />}</button>
                                    <div className="flex-1 flex items-center h-full"><input dir="ltr" type="range" min="0" max={previewDuration || 0} step="any" value={previewTime} onChange={(e) => { const t = parseFloat(e.target.value); audioPreviewRef.current.currentTime = t; setPreviewTime(t); }} className="w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none transition-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm" style={{ background: `linear-gradient(to right, var(--color-primary) ${(previewTime / (previewDuration || 1)) * 100}%, var(--color-border) ${(previewTime / (previewDuration || 1)) * 100}%)`, transition: 'none' }} /></div>
                                    <button type="button" onClick={cancelRecording} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition shrink-0"><Trash2 size={20} /></button><audio ref={audioPreviewRef} src={audioUrl} onLoadedMetadata={(e) => setPreviewDuration(e.target.duration)} onEnded={() => { setIsPlayingPreview(false); setPreviewTime(0); }} onTimeUpdate={(e) => setPreviewTime(e.target.currentTime)} hidden />
                                </div>
                            ) : (
                                <div className="w-full flex items-center px-1.5">
                                    <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-muted hover:text-primary transition-colors hover:bg-surface rounded-full shrink-0"><Smile size={22} /></button>
                                    <input type="text" value={newMessage} onChange={setNewMessage} placeholder={replyTo ? t("chat.placeholderReply") : t("chat.placeholder")} className="w-full bg-transparent text-content px-2 py-2 focus:outline-none min-w-0 placeholder-muted/70" />
                                    <div className="flex items-center gap-0.5 shrink-0"><input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageSelect} /><button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-muted hover:text-primary transition-colors hover:bg-surface rounded-full"><ImageIcon size={22} /></button><button type="button" onClick={startRecording} className="p-2 text-muted hover:text-primary transition-colors hover:bg-surface rounded-full"><Mic size={22} /></button></div>
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={!newMessage.trim() && !selectedImage && !audioBlob} className={`p-3.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-md ${(newMessage.trim() || selectedImage || audioBlob) ? "bg-primary text-white hover:scale-105 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 cursor-pointer" : "bg-surface text-muted border border-adaptive cursor-not-allowed"}`}>{editingMessage ? <Check size={20} /> : <Send size={20} strokeWidth={2.5} className={`rtl:rotate-270 ${newMessage.trim() ? "ms-0.5" : ""}`} />}</button>
                    </form>
                </>
            )}
        </div>
    );
});

ChatInputArea.displayName = "ChatInputArea";

export default ChatInputArea;
