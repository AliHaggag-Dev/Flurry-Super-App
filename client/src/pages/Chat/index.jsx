import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    useLayoutEffect,
    useMemo
} from 'react';

// --- Router & Redux ---
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

// --- Third Party Libraries ---
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";

// --- Local Imports ---
import api from "../../lib/axios";
import { useSocketContext } from "../../context/SocketContext";
import { useCall } from "../../context/CallContext";
import { fetchMyConnections } from "../../features/connectionsSlice";
import ChatInfoSidebar from "../../components/chat/ChatInfoSidebar";
import MessageItem from "../../components/chat/MessageItem";
import ReactionDetailsModal from "../../components/modals/ReactionDetailsModal";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
import useOfflineSync from "../../hooks/useOfflineSync";

// --- Subfolder Components ---
import ChatHeader from "./ChatHeader";
import ChatInputArea from "./ChatInputArea";
import TypingIndicator from "./TypingIndicator";

/**
 * Chat Component
 * --------------
 * Main messaging interface. Handles real-time sockets, media recording, 
 * offline synchronization, and interaction logic.
 */
const Chat = () => {
    // ========================================================
    // 🌍 Global Hooks & State
    // ========================================================
    const { id: targetUserId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t, i18n } = useTranslation();
    const { getToken, userId } = useAuth();
    const { socket, onlineUsers } = useSocketContext();
    const { addToQueue } = useOfflineSync();
    const { callUser } = useCall();

    const currentLocale = useMemo(() => (i18n.language === 'ar' ? ar : enUS), [i18n.language]);

    const { currentUser } = useSelector((state) => state.user);
    const { connections } = useSelector((state) => state.connections || { connections: [] });

    // ========================================================
    // 📊 Local State
    // ========================================================
    // Derived Data
    const connectionUser = useMemo(() => connections?.find(c => (c._id || c) === targetUserId), [connections, targetUserId]);

    // User & Message State
    const [messages, setMessages] = useState([]);
    const [targetUser, setTargetUser] = useState(connectionUser || null);
    const [newMessage, setNewMessage] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [highlightedId, setHighlightedId] = useState(null);
    const [activeReactionId, setActiveReactionId] = useState(null);
    const [viewReactionMessage, setViewReactionMessage] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingOld, setIsFetchingOld] = useState(false);

    // UI Toggles
    const [showEmoji, setShowEmoji] = useState(false);
    const [showChatInfo, setShowChatInfo] = useState(false);
    const [activeMobileActionId, setActiveMobileActionId] = useState(null);

    // Media & Recording
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);

    // Audio Preview
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [previewTime, setPreviewTime] = useState(0);
    const [previewDuration, setPreviewDuration] = useState(0);

    // Typing Status
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Sync
    const [syncTrigger, setSyncTrigger] = useState(0);

    // ========================================================
    // 🔗 Refs
    // ========================================================
    const messagesEndRef = useRef(null);
    const messageRefs = useRef({});
    const fileInputRef = useRef(null);
    const timerRef = useRef(null);
    const audioPreviewRef = useRef(null);
    const isFirstLoad = useRef(true);
    const typingTimeoutRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const prevScrollHeightRef = useRef(null);
    const prevMessagesLength = useRef(0);

    // ========================================================
    // 🧠 Derived Logic (Memoized)
    // ========================================================
    const isBlockedByMe = useMemo(() => currentUser?.blockedUsers?.includes(targetUserId), [currentUser, targetUserId]);
    const isBlockedByThem = useMemo(() => targetUser?.blockedUsers?.includes(currentUser?._id), [targetUser, currentUser]);
    const isChatDisabled = isBlockedByMe || isBlockedByThem;
    const isConnected = useMemo(() => connections?.some(c => (c._id || c) === targetUserId), [connections, targetUserId]);
    const isOnline = useMemo(() => onlineUsers?.includes(targetUser?._id), [onlineUsers, targetUser]);

    // ========================================================
    // ⚡ Handlers & API
    // ========================================================

    const fetchMoreMessages = useCallback(async () => {
        if (!hasMore || isFetchingOld) return;

        if (scrollContainerRef.current) {
            prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
        }

        setIsFetchingOld(true);
        try {
            const token = await getToken();
            const nextPage = page + 1;

            const res = await api.get(`/message/${targetUserId}?page=${nextPage}&limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m._id));
                    const uniqueNewMessages = res.data.data.filter(msg => !existingIds.has(msg._id));
                    return [...uniqueNewMessages, ...prev];
                });
                setHasMore(res.data.hasMore);
                setPage(nextPage);
            }
        } catch (error) {
            console.error("Failed to load older messages", error);
        } finally {
            setIsFetchingOld(false);
        }
    }, [page, hasMore, isFetchingOld, targetUserId, getToken]);

    const lastMsgRef = useInfiniteScroll(fetchMoreMessages, hasMore, isFetchingOld);

    const scrollToMessage = useCallback((messageId) => {
        const element = messageRefs.current[messageId];
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            setHighlightedId(messageId);
            setTimeout(() => setHighlightedId(null), 1000);
        } else {
            toast(t("chat.toasts.messageNotLoaded"), { icon: "🔍" });
        }
    }, [t]);

    const handleMessagesClear = useCallback(() => {
        setMessages([]);
        setShowChatInfo(false);
    }, []);

    const handleImageSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const url = URL.createObjectURL(file);
            setImagePreview(url);
        }
    }, []);

    const handleDeleteMessage = useCallback(async (messageId) => {
        setMessages(prev => prev.map(msg =>
            msg._id === messageId ? { ...msg, isDeleted: true } : msg
        ));

        try {
            const token = await getToken();
            await api.delete(`/message/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Delete failed", error);
            toast.error(t("message.delete_failed"));
        }
    }, [getToken, t]);

    const handleEditMessage = useCallback((msg) => {
        setEditingMessage(msg);
        setNewMessage(msg.text);
        fileInputRef.current?.focus();
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingMessage(null);
        setNewMessage("");
    }, []);

    // Cleanup Image Object URL
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleReaction = useCallback(async (msgId, emoji) => {
        setActiveReactionId(null);
        setMessages(prev => prev.map(msg => {
            if (msg._id === msgId) {
                const userObj = {
                    _id: currentUser._id,
                    full_name: currentUser.full_name,
                    username: currentUser.username,
                    profile_picture: currentUser.profile_picture || currentUser.image
                };
                const existingIndex = msg.reactions?.findIndex(r => r.user?._id === currentUser._id || r.user === currentUser._id);
                let newReactions = msg.reactions ? [...msg.reactions] : [];

                if (existingIndex > -1) {
                    if (newReactions[existingIndex].emoji === emoji) {
                        newReactions.splice(existingIndex, 1);
                    } else {
                        newReactions[existingIndex] = { ...newReactions[existingIndex], emoji: emoji };
                    }
                } else {
                    newReactions.push({ user: userObj, emoji });
                }
                return { ...msg, reactions: newReactions };
            }
            return msg;
        }));

        try {
            const token = await getToken();
            await api.post("/message/react", { messageId: msgId, emoji }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            console.error("Reaction failed");
            toast.error(t("chat.toasts.reactionFailed"));
        }
    }, [currentUser, getToken, t]);

    const handleSetReplyTo = useCallback((msg) => setReplyTo(msg), []);
    const handleSetViewReactionMessage = useCallback((msg) => setViewReactionMessage(msg), []);
    const handleSetActiveReactionId = useCallback((id) => setActiveReactionId(prev => prev === id ? null : id), []);

    const handleInputChange = useCallback((e) => {
        setNewMessage(e.target.value);

        if (!socket || !targetUser?._id) return;

        if (!typing) {
            setTyping(true);
            socket.emit("typing", targetUser._id);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
            socket.emit("stop typing", targetUser._id);
        }, 3000);
    }, [socket, targetUser, typing]);

    // ========================================================
    // 🔄 Effects & Data Fetching
    // ========================================================

    // 1. Initial Load & Offline Queue
    useEffect(() => {
        if (!targetUserId) return;
        const loadData = async () => {
            const token = await getToken();
            dispatch(fetchMyConnections(token));

            if (!targetUser) {
                try {
                    const { data } = await api.get(`/user/${targetUserId}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (data.success) setTargetUser(data.user);
                    else navigate(-1);
                } catch (error) { console.error("Error fetching user:", error); }
            }

            try {
                const msgRes = await api.get(`/message/${targetUserId}?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
                let loadedMessages = msgRes.data.data || [];

                const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
                const pendingForThisChat = offlineQueue
                    .filter(item => item.data.receiverId === targetUserId)
                    .map(item => ({
                        _id: item.timestamp || Date.now(),
                        text: item.data.text,
                        sender: {
                            _id: currentUser?._id || userId,
                            profile_picture: currentUser?.profile_picture || currentUser?.image
                        },
                        message_type: "text",
                        createdAt: new Date(item.timestamp || Date.now()).toISOString(),
                        status: "pending",
                        isSending: true,
                        read: false,
                        replyTo: item.data.replyTo ? { _id: item.data.replyTo, text: "Loading..." } : null
                    }));

                setMessages([...loadedMessages, ...pendingForThisChat]);
                setHasMore(msgRes.data.hasMore);
                setPage(1);

                await api.put(`/message/read/${targetUserId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            } catch (error) { console.error("Error loading chat:", error); }
        };
        loadData();
    }, [targetUserId, getToken, dispatch, targetUser, navigate, currentUser, userId, syncTrigger]);

    // 2. Socket Listeners (Messages)
    useEffect(() => {
        if (!socket) return;
        const handleReceiveMessage = async (incomingMsg) => {
            const senderId = incomingMsg.sender._id || incomingMsg.sender;

            if (senderId.toString() === targetUserId.toString()) {
                setMessages((prev) => [...prev, { ...incomingMsg, read: true }]);

                const token = await getToken();
                await api.put(`/message/read/${targetUserId}`, {}, { headers: { Authorization: `Bearer ${token}` } });

                socket.emit("messageReceivedConfirm", {
                    messageId: incomingMsg._id,
                    senderId: senderId,
                    receiverId: currentUser._id
                });
            }
        };

        const handleMessageDelivered = ({ messageId, toUserId }) => {
            if (targetUserId === toUserId) {
                setMessages((prev) => prev.map(msg => {
                    if (messageId && msg._id === messageId) {
                        return { ...msg, delivered: true };
                    }
                    if (!messageId && !msg.read && !msg.delivered) {
                        return { ...msg, delivered: true };
                    }
                    return msg;
                }));
            }
        };

        const handleMessagesSeen = ({ byUserId }) => {
            if (byUserId.toString() === targetUserId.toString()) {
                setMessages((prev) => prev.map(msg => ({ ...msg, read: true })));
            }
        };

        const handleMessageReaction = ({ messageId, reactions }) => {
            setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, reactions } : msg));
        };

        socket.on("receiveMessage", handleReceiveMessage);
        socket.on("messageDelivered", handleMessageDelivered);
        socket.on("messagesSeen", handleMessagesSeen);
        socket.on("messageReaction", handleMessageReaction);

        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
            socket.off("messageDelivered", handleMessageDelivered);
            socket.off("messagesSeen", handleMessagesSeen);
            socket.off("messageReaction", handleMessageReaction);
        };
    }, [socket, targetUserId, getToken, currentUser]);

    // 3. Socket Listeners (Typing & Updates)
    useEffect(() => {
        if (!socket) return;
        const onTyping = () => setIsTyping(true);
        const onStopTyping = () => setIsTyping(false);

        socket.on("typing", onTyping);
        socket.on("stop typing", onStopTyping);
        socket.on("messageDeleted", ({ messageId }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, isDeleted: true, text: "", media_url: null } : msg
            ));
        });
        socket.on("messageUpdated", ({ messageId, newText, isEdited }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg
            ));
        });

        return () => {
            socket.off("typing", onTyping);
            socket.off("stop typing", onStopTyping);
            socket.off("messageDeleted");
            socket.off("messageUpdated");
        };
    }, [socket]);

    // 4. Sync Event
    useEffect(() => {
        const handleSyncComplete = () => {
            setSyncTrigger(prev => prev + 1);
        };
        window.addEventListener("messages-synced", handleSyncComplete);
        return () => window.removeEventListener("messages-synced", handleSyncComplete);
    }, []);

    // 5. Scroll Logic
    useLayoutEffect(() => {
        if (prevScrollHeightRef.current && scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeightRef.current;
            scrollContainerRef.current.scrollTop += heightDifference;
            prevScrollHeightRef.current = null;
            return;
        }

        if (isFirstLoad.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            isFirstLoad.current = false;
        }
        else if (messages.length > prevMessagesLength.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }

        prevMessagesLength.current = messages.length;
    }, [messages]);

    // 6. Audio Preview Animation
    useEffect(() => {
        let animationFrame;
        const animatePreview = () => {
            if (audioPreviewRef.current) {
                setPreviewTime(audioPreviewRef.current.currentTime);
                if (!audioPreviewRef.current.paused && !audioPreviewRef.current.ended) {
                    animationFrame = requestAnimationFrame(animatePreview);
                }
            }
        };
        if (isPlayingPreview) animationFrame = requestAnimationFrame(animatePreview);
        else cancelAnimationFrame(animationFrame);
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlayingPreview]);

    // ========================================================
    // 🎙️ Audio & Media Logic
    // ========================================================

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
        } catch (err) { toast.error(t("chat.toasts.micDenied")); }
    }, [t]);

    const stopRecording = useCallback(() => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }, [mediaRecorder]);

    const cancelRecording = useCallback(() => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setIsRecording(false);
        setRecordingDuration(0);
        setPreviewTime(0);
        setIsPlayingPreview(false);
        clearInterval(timerRef.current);
        if (mediaRecorder) mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }, [mediaRecorder, audioUrl]);

    const formatDuration = (sec) => {
        const min = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${min}:${s < 10 ? "0" : ""}${s}`;
    };

    const getPostIdFromText = (text) => {
        if (!text || typeof text !== "string") return null;
        const match = text.match(/post\/([a-fA-F0-9]{24})/);
        return match ? match[1] : null;
    };

    const handleEmojiClick = useCallback((emojiObject) => {
        setNewMessage((prev) => prev + emojiObject.emoji);
    }, []);

    // ========================================================
    // 📤 Send Logic
    // ========================================================
    const sendMessage = useCallback(async (e) => {
        if (e) e.preventDefault();

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        setTyping(false);
        if (socket && targetUser?._id) socket.emit("stop typing", targetUser._id);

        if (editingMessage) {
            if (!newMessage.trim()) return;
            setMessages(prev => prev.map(msg =>
                msg._id === editingMessage._id ? { ...msg, text: newMessage, isEdited: true } : msg
            ));
            const msgId = editingMessage._id;
            const updatedText = newMessage;
            cancelEdit();
            try {
                const token = await getToken();
                await api.put(`/message/${msgId}`, { text: updatedText }, { headers: { Authorization: `Bearer ${token}` } });
            } catch (error) {
                console.error("Edit failed");
                toast.error("Failed to edit message");
            }
            return;
        }

        if (!newMessage.trim() && !selectedImage && !audioBlob) return;
        if (!targetUser || !currentUser) return;

        if (currentUser?.blockedUsers?.includes(targetUser._id) || targetUser.blockedUsers?.includes(currentUser._id)) {
            toast.error(t("chat.toasts.blockedError"));
            return;
        }

        const detectedSharedPostId = getPostIdFromText(newMessage);
        let msgType = "text";
        if (selectedImage) msgType = "image";
        else if (audioBlob) msgType = "audio";
        else if (detectedSharedPostId) msgType = "shared_post";

        const tempId = Date.now();
        const tempMessage = {
            _id: tempId,
            text: newMessage,
            sender: { _id: currentUser._id || userId, profile_picture: currentUser.profile_picture || currentUser.image },
            message_type: msgType,
            media_url: selectedImage ? imagePreview : audioBlob ? audioUrl : "",
            sharedPostId: detectedSharedPostId,
            replyTo: replyTo,
            createdAt: new Date().toISOString(),
            status: navigator.onLine ? "sending" : "pending",
            isSending: true,
            read: false,
        };

        if (scrollContainerRef.current) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
        }

        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage(""); setSelectedImage(null); setImagePreview(null); cancelRecording(); setShowEmoji(false); setReplyTo(null);

        if (!navigator.onLine) {
            if (selectedImage || audioBlob) {
                toast.error("Media cannot be sent offline yet");
                setMessages((prev) => prev.filter(msg => msg._id !== tempId));
                return;
            }
            addToQueue("/message/send", {
                receiverId: targetUserId,
                text: tempMessage.text,
                sharedPostId: detectedSharedPostId,
                replyTo: replyTo?._id
            });
            return;
        }

        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append("receiverId", targetUserId);
            if (tempMessage.text) formData.append("text", tempMessage.text);
            if (detectedSharedPostId) formData.append("sharedPostId", detectedSharedPostId);
            if (replyTo) formData.append("replyTo", replyTo._id);
            if (selectedImage) formData.append("image", selectedImage);
            else if (audioBlob) {
                const audioFile = new File([audioBlob], "voice-note.webm", { type: "audio/webm" });
                formData.append("image", audioFile);
            }

            const { data } = await api.post("/message/send", formData, { headers: { Authorization: `Bearer ${token}` } });

            if (data.success) {
                setMessages((prev) => prev.map(msg => {
                    if (msg._id === tempId) {
                        return {
                            ...data.data,
                            status: "sent",
                            read: msg.read || data.data.read
                        };
                    }
                    return msg;
                }));
            }
        } catch (error) {
            console.error("Send Error:", error);
            if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
                if (!selectedImage && !audioBlob) {
                    addToQueue("/message/send", {
                        receiverId: targetUserId,
                        text: tempMessage.text,
                        sharedPostId: detectedSharedPostId,
                        replyTo: replyTo?._id
                    });
                    setMessages(prev => prev.map(msg => msg._id === tempId ? { ...msg, status: "pending", isSending: false } : msg));
                    return;
                }
            }
            toast.error(t("chat.toasts.sendFailed"));
            setMessages((prev) => prev.filter(msg => msg._id !== tempId));
        }
    }, [newMessage, selectedImage, audioBlob, targetUser, currentUser, replyTo, targetUserId, userId, imagePreview, audioUrl, socket, getToken, cancelRecording, t, addToQueue, editingMessage]);

    // ========================================================
    // 🎨 Render Logic
    // ========================================================

    if (!targetUser) return (
        <div className="flex h-screen items-center justify-center bg-main sm:ms-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="flex flex-row h-screen scrollbar-hide overflow-hidden">
            <div className="flex flex-col flex-1 h-screen bg-main text-content relative overflow-hidden transition-colors duration-300">

                {/* --- Header --- */}
                <ChatHeader
                    targetUser={targetUser}
                    isChatDisabled={isChatDisabled}
                    isOnline={isOnline}
                    currentUser={currentUser}
                    onBack={() => navigate(-1)}
                    onProfile={() => navigate(`/profile/${targetUserId}`)}
                    onCall={(video) => callUser(targetUser._id, targetUser.full_name, currentUser.full_name, video)}
                    onInfo={() => setShowChatInfo(true)}
                    t={t}
                    locale={currentLocale}
                />

                {/* --- Chat Area --- */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-24 pb-4 space-y-6 scrollbar-hide bg-main relative">
                    {activeMobileActionId && (
                        <div className="fixed inset-0 z-40" onTouchStart={(e) => { e.stopPropagation(); setActiveMobileActionId(null); }} onClick={(e) => { e.stopPropagation(); setActiveMobileActionId(null); }} />
                    )}

                    {isFetchingOld && (<div className="flex justify-center py-2"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>)}

                    {messages.map((msg, index) => {
                        const isFirstMessage = index === 0;
                        return (
                            <div key={msg._id || index} ref={(el) => { messageRefs.current[msg._id] = el; if (isFirstMessage) lastMsgRef(el); }}>
                                <MessageItem
                                    msg={msg}
                                    userId={currentUser?._id || userId}
                                    setReplyTo={handleSetReplyTo}
                                    setActiveReactionId={handleSetActiveReactionId}
                                    activeReactionId={activeReactionId}
                                    handleReaction={handleReaction}
                                    setViewReactionMessage={handleSetViewReactionMessage}
                                    scrollToMessage={scrollToMessage}
                                    highlightedId={highlightedId}
                                    readStatus={msg.read ? "read" : msg.delivered ? "delivered" : "sent"}
                                    t={t}
                                    currentLocale={currentLocale}
                                    onEdit={handleEditMessage}
                                    onDelete={handleDeleteMessage}
                                />
                            </div>
                        );
                    })}

                    <TypingIndicator isTyping={isTyping} targetUser={targetUser} />
                    <div ref={messagesEndRef} />
                </div>

                {/* --- Input Area --- */}
                <ChatInputArea
                    newMessage={newMessage}
                    setNewMessage={handleInputChange}
                    sendMessage={sendMessage}
                    isChatDisabled={isChatDisabled}
                    isConnected={isConnected}
                    isBlockedByMe={isBlockedByMe}
                    targetUserId={targetUserId}
                    navigate={navigate}
                    showEmoji={showEmoji}
                    setShowEmoji={setShowEmoji}
                    onEmojiClick={handleEmojiClick}
                    fileInputRef={fileInputRef}
                    handleImageSelect={handleImageSelect}
                    startRecording={startRecording}
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    stopRecording={stopRecording}
                    cancelRecording={cancelRecording}
                    audioBlob={audioBlob}
                    audioUrl={audioUrl}
                    isPlayingPreview={isPlayingPreview}
                    setIsPlayingPreview={setIsPlayingPreview}
                    audioPreviewRef={audioPreviewRef}
                    previewTime={previewTime}
                    setPreviewTime={setPreviewTime}
                    previewDuration={previewDuration}
                    setPreviewDuration={setPreviewDuration}
                    selectedImage={selectedImage}
                    imagePreview={imagePreview}
                    setSelectedImage={setSelectedImage}
                    setImagePreview={setImagePreview}
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    editingMessage={editingMessage}
                    cancelEdit={cancelEdit}
                    t={t}
                    formatDuration={formatDuration}
                />
            </div>

            <ReactionDetailsModal isOpen={!!viewReactionMessage} onClose={() => setViewReactionMessage(null)} message={viewReactionMessage} />
            <ChatInfoSidebar data={targetUser} isGroup={false} isOpen={showChatInfo} onClose={() => setShowChatInfo(false)} messages={messages} onMessagesClear={handleMessagesClear} />
        </div>
    );
};

export default Chat;
