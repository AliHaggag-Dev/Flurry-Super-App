import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, Pause, Play, StopCircle, Send, Smile, ImageIcon, Mic, BarChart2, Loader2, Lock, Check } from "lucide-react";

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const ChatInputArea = React.memo((props) => {
    const {
        isChatLocked, amIAdmin, t, showEmoji, setShowEmoji, handleEmojiClick,
        imagePreview, clearImage, replyTo, setReplyTo, editingMessage, cancelEdit,
        isRecording, audioBlob, recordingDuration, formatDuration, audioPreviewRef, audioUrl,
        isPlayingPreview, setIsPlayingPreview, previewDurationState, setPreviewDurationState,
        previewTime, setPreviewTime, cancelRecording, stopRecording, sendMessageToBackend,
        newMessage, handleInputChange, showAttachments, setShowAttachments, fileInputRef,
        handleImageSelect, startRecording, setShowPollModal
    } = props;

    if (isChatLocked && !amIAdmin) {
        return (
            <div className="bg-surface p-4 border-adaptive shrink-0 z-30">
                <div className="flex flex-col items-center justify-center py-4 bg-main/50 rounded-2xl border-dashed border-adaptive mx-4 animate-in fade-in">
                    <div className="bg-surface p-3 rounded-full mb-2 shadow-sm"><Lock size={20} className="text-red-500" /></div>
                    <p className="text-sm font-bold text-muted">{t("groupChat.chatLockedMsg")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface p-2 md:p-4 border-adaptive shrink-0 z-30">
            {/* Emoji Picker Modal */}
            {showEmoji && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowEmoji(false)}>
                    <div className="relative bg-surface rounded-2xl shadow-2xl border-adaptive animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowEmoji(false)} className="absolute -top-3 -end-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md z-50 transition-transform hover:scale-110"><X size={16} strokeWidth={3} /></button>
                        <Suspense fallback={<div className="w-[350px] h-[450px] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
                            <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" lazyLoadEmojis={true} width={350} height={450} style={{ "--epe-bg-color": "rgb(var(--color-surface))", "--epe-category-label-bg-color": "rgb(var(--color-main))", "--epe-text-color": "rgb(var(--color-content))", "--epe-search-border-color": "rgb(var(--color-border))", "--epe-search-input-bg-color": "rgb(var(--color-main))" }} />
                        </Suspense>
                    </div>
                </div>
            )}

            {/* Previews (Image/Reply/Edit) */}
            <AnimatePresence>
                {imagePreview && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3 bg-main p-3 rounded-xl mb-3 border-adaptive">
                        <img src={imagePreview} alt="preview" className="w-12 h-12 rounded-sg object-cover" />
                        <div className="flex-1"><p className="text-content text-sm font-medium">{t("chat.imageSelected")}</p><p className="text-muted text-xs">{t("chat.readyToSend")}</p></div>
                        <button onClick={clearImage} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition"><Trash2 size={18} /></button>
                    </motion.div>
                )}
                {replyTo && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center justify-between bg-main p-3 rounded-xl mb-3 border-primary shadow-sm">
                        <div className="overflow-hidden"><span className="text-primary text-xs font-bold block mb-1">{t("chat.replyingTo")} {replyTo.sender?.username}</span><span className="text-muted text-xs truncate block">{replyTo.text}</span></div>
                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-surface rounded-full transition text-muted hover:text-content"><X size={16} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {editingMessage && (<div className="flex items-center justify-between bg-surface/80 px-4 py-2 border-primary/20 text-xs text-primary mb-2 rounded-t-xl"><span>Editing message...</span><button onClick={cancelEdit} className="text-muted hover:text-content"><X size={14} /></button></div>)}

            {/* Input or Recorder */}
            {(isRecording || audioBlob) ? (
                <div className="flex items-center gap-4 bg-main rounded-full px-4 py-2 border-adaptive shadow-md animate-in slide-in-from-bottom-2">
                    <button onClick={cancelRecording} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition"><Trash2 size={20} /></button>
                    {isRecording ? (
                        <div className="flex-1 flex items-center justify-center gap-3 text-content">
                            <span className="text-red-500 animate-pulse text-[10px] font-bold">REC</span>
                            <span className="font-mono w-12">{formatDuration(recordingDuration)}</span>
                            <div className="flex items-center gap-1 h-6">{[...Array(5)].map((_, i) => (<div key={i} className={`audio-wave-bar ${i === 2 ? 'h-5' : i % 2 === 0 ? 'h-3' : 'h-2'}`}></div>))}</div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-3 bg-surface rounded-full px-2 border-adaptive">
                            <audio ref={audioPreviewRef} src={audioUrl} onLoadedMetadata={() => setPreviewDurationState(audioPreviewRef.current.duration)} onEnded={() => { setIsPlayingPreview(false); setPreviewTime(0); }} hidden />
                            <button onClick={() => { if (isPlayingPreview) audioPreviewRef.current.pause(); else audioPreviewRef.current.play(); setIsPlayingPreview(!isPlayingPreview); }} className="p-2 bg-primary hover:opacity-90 rounded-full text-white transition shadow-sm">{isPlayingPreview ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
                            <div className="flex-1 flex flex-col justify-center h-full pt-1">
                                <input dir="ltr" type="range" min="0" max={previewDurationState || 0}
                                    step="0.01" value={previewTime} onChange={(e) => { const time = parseFloat(e.target.value); audioPreviewRef.current.currentTime = time; setPreviewTime(time); }}
                                    className="w-full h-1 bg-muted/30 rounded-full appearance-none cursor-pointer focus:outline-none transition-none [&::-webkit-slider-thumb]:appearance-none 
                                        [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                                        [&::-webkit-slider-thumb]:shadow-sm" style={{
                                        background: `linear-gradient(to right, var(--color-primary) 
                                        ${(previewTime / (previewDurationState || 1)) * 100}%, var(--color-text-sec) ${(previewTime / (previewDurationState || 1)) * 100}%)`
                                    }} />
                                <div className="flex justify-between text-[8px] text-muted font-mono mt-0.5 px-0.5"><span>{formatDuration(previewTime)}</span><span>{formatDuration(previewDurationState)}</span></div>
                            </div>
                        </div>
                    )}
                    {isRecording ? (<button onClick={stopRecording} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition"><StopCircle size={24} /></button>) : (<button onClick={(e) => sendMessageToBackend(e)} className="p-3 bg-primary hover:opacity-90 text-white rounded-full transition shadow-md hover:scale-105"><Send size={20} className="ms-0.5 rtl:rotate-270" /></button>)}
                </div>
            ) : (
                <form onSubmit={(e) => sendMessageToBackend(e)} className="flex items-center gap-2 md:gap-3 max-w-5xl mx-auto">
                    <div className="flex-1 bg-main rounded-3xl flex items-center px-2 py-1.5 border border-adaptive focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-full transition ${showEmoji ? "text-yellow-500 bg-surface" : "text-muted hover:text-content hover:bg-surface"}`}><Smile size={20} /></button>
                        <input type="text" value={newMessage} onChange={handleInputChange} placeholder={replyTo ? t("chat.placeholderReply") : t("chat.placeholder")} className="w-full flex-1 bg-transparent text-content placeholder-muted px-2 py-2 focus:outline-none border-none min-w-0" />

                        <div className="flex items-center gap-1 pe-1">
                            <button type="button" onClick={() => setShowAttachments(!showAttachments)} className="md:hidden p-2 text-muted hover:text-content rounded-full transition"><Plus size={20} className={`transition-transform duration-300 ${showAttachments ? "rotate-45" : ""}`} /></button>
                            <div className={`${showAttachments ? "flex animate-in slide-in-from-right-5 fade-in duration-300" : "hidden"} md:flex items-center gap-1 absolute md:static bottom-14 md:bottom-auto left-6 md:right-auto bg-surface md:bg-transparent p-2 md:p-0 rounded-full md:rounded-none shadow-xl md:shadow-none border md:border-none border-adaptive z-50`}>
                                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageSelect} />
                                <button type="button" onClick={() => { fileInputRef.current.click(); setShowAttachments(false); }} className={`p-2 rounded-full transition ${imagePreview ? "text-primary bg-primary/10" : "text-muted hover:text-content hover:bg-surface"}`}><ImageIcon size={20} /></button>
                                <button type="button" onClick={() => { startRecording(); setShowAttachments(false); }} className="p-2 text-muted hover:text-content hover:bg-surface rounded-full transition"><Mic size={20} /></button>
                                <button type="button" onClick={() => { setShowPollModal(true); setShowAttachments(false); }} className="p-2 text-muted hover:text-content hover:bg-surface rounded-full transition"><BarChart2 size={20} /></button>
                            </div>
                        </div>
                    </div>
                    <button type="submit" disabled={!newMessage.trim() && !imagePreview && !audioBlob} className={`p-3 md:p-3.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${(newMessage.trim() || imagePreview || audioBlob) ? "bg-primary text-white shadow-lg hover:scale-105 hover:bg-primary/80 hover:shadow-xl cursor-pointer" : "bg-primary/50 text-white/50 cursor-not-allowed"}`}>
                        {editingMessage ? <Check size={20} /> : <Send size={20} strokeWidth={2.5} className="rtl:rotate-270" />}
                    </button>
                </form>
            )}
        </div>
    );
});

ChatInputArea.displayName = "ChatInputArea";

export default ChatInputArea;
