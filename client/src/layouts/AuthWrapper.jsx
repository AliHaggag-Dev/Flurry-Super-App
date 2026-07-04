import { useEffect, useState, useRef } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useUser, useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw } from "lucide-react";

// --- Local Imports ---
import { syncUser } from "../features/userSlice";
import { addRealtimeMessage } from "../features/messagesSlice";
import { useSocketContext } from "../context/SocketContext";
import Loading from "../components/common/Loading";

/**
 * AuthWrapper Component
 *
 * Acts as a layout guard that:
 * 1. Ensures the Clerk user is authenticated and data is loaded.
 * 2. Syncs the Clerk user data with the backend database via Redux.
 * 3. Establishes global Socket.io listeners for real-time notifications/messages.
 *
 * @returns {JSX.Element} The rendered Outlet or a Loading spinner.
 */
const AuthWrapper = () => {
    // --- Hooks & Context ---
    const dispatch = useDispatch();
    const location = useLocation();
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const { socket } = useSocketContext();
    const { t } = useTranslation();

    // --- Refs & State ---
    // Using ref to access current path inside socket callbacks without re-binding listeners
    const pathnameRef = useRef(location.pathname);
    const [isSynced, setIsSynced] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [syncTrigger, setSyncTrigger] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);

    // --- Redux Selectors ---
    const { currentUser } = useSelector((state) => state.user);

    // --- Effects ---

    // 1. Keep pathnameRef updated (Crucial for socket logic)
    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    // 2. User Synchronization Logic
    useEffect(() => {
        if (isSynced) return;

        const runSync = async () => {
            if (isLoaded && user && !isSynced) {
                try {
                    const token = await getToken();
                    const userData = {
                        id: user.id,
                        email: user.emailAddresses[0]?.emailAddress,
                        username: user.username,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl,
                    };

                    await dispatch(syncUser({ userData, token })).unwrap();
                    setIsSynced(true);
                    setSyncError(false);
                } catch (error) {
                    console.error("Sync failed:", error);
                    setSyncError(true);
                } finally {
                    setIsRetrying(false);
                }
            }
        };

        if (isLoaded && user) {
            runSync();
        }
    }, [isLoaded, user, getToken, dispatch, isSynced, syncTrigger]);

    // 3. Real-time Message Listener
    useEffect(() => {
        // Guard clause: Ensure dependencies exist before attaching listeners
        if (!socket || !isSynced || !currentUser) return;

        const handleNewMessage = (newMessage) => {
            // Check if user is currently viewing the chat with the sender
            // Using ref ensures we don't need to add location.pathname to dependency array
            const isChattingWithSender = pathnameRef.current === `/messages/${newMessage.sender._id}`;

            if (isChattingWithSender) {
                // If chat is open, update Redux store immediately
                dispatch(addRealtimeMessage(newMessage));
            } else {
                // If on another page, show a notification
                toast.success(t("chat.toasts.newMessage", { name: newMessage.sender.full_name }), {
                    icon: "💬",
                    duration: 4000,
                    className: "bg-surface text-content border border-adaptive",
                });

                // Optional: Play notification sound here
            }
        };

        // Attach Listener
        socket.on("receiveMessage", handleNewMessage);

        // Cleanup Listener
        return () => {
            socket.off("receiveMessage", handleNewMessage);
        };
    }, [socket, isSynced, currentUser, dispatch]);

    const handleRetry = () => {
        setIsRetrying(true);
        setSyncTrigger(prev => prev + 1);
    };

    // --- Render ---

    if (syncError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-main text-content px-4 text-center animate-in fade-in duration-500">
                <div className="bg-red-500/10 p-5 rounded-full mb-6 border border-red-500/20 shadow-lg animate-bounce">
                    <WifiOff size={50} className="text-red-500" />
                </div>

                <h2 className="text-3xl font-bold mb-3 tracking-tight">
                    {t('error.connectionTitle', 'Connection Failed')}
                </h2>

                <p className="text-muted mb-8 max-w-md text-lg leading-relaxed">
                    {t('error.connectionMessage', "We couldn't connect to the server. The database might be waking up. Please try again.")}
                </p>

                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw size={20} className={isRetrying ? "animate-spin" : ""} />
                    {t('error.retryButton', 'Try Again')}
                </button>
            </div>
        );
    }

    if (!isLoaded || !user || !isSynced) {
        return <Loading />;
    }

    return <Outlet />;
};

export default AuthWrapper;