import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Layers,
    ArrowRight
} from "lucide-react";

// --- Local Imports ---
import api from "../../lib/axios";
import Loading from "../../components/common/Loading";

// --- Subfolder Components ---
import FilterTabs from "./FilterTabs";
import GroupCard from "./GroupCard";

// Lazy Load Modal
const CreateGroupModal = lazy(() => import("../../components/modals/CreateGroupModal"));

const MyGroups = () => {
    // --- State & Hooks ---
    const [allGroups, setAllGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { userId, getToken } = useAuth();
    const navigate = useNavigate();
    const { currentUser } = useSelector((state) => state.user);
    const { t } = useTranslation();

    // --- Effects ---

    useEffect(() => {
        const fetchUserGroups = async () => {
            try {
                const token = await getToken();
                const res = await api.get("/group/my-groups", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const myGroups = res.data.groups || [];
                setAllGroups(myGroups);
                setFilteredGroups(myGroups);
            } catch (err) {
                console.error("Error fetching groups:", err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchUserGroups();
    }, [userId, getToken]);

    useEffect(() => {
        if (!userId) return;

        // Memoized filtering logic inside effect
        let result = [];
        if (filter === "all") {
            result = allGroups;
        } else if (filter === "managed") {
            result = allGroups.filter(g => g.owner?.clerkId === userId);
        } else if (filter === "joined") {
            result = allGroups.filter(g => g.owner?.clerkId !== userId);
        }
        setFilteredGroups(result);

    }, [filter, allGroups, userId]);

    // --- Handlers ---

    const handleGroupCreated = useCallback((newGroup) => {
        setAllGroups(prev => [newGroup, ...prev]);
    }, []);

    const toggleModal = useCallback(() => {
        setShowCreateModal(prev => !prev);
    }, []);

    // --- Render ---

    if (loading) return <Loading />;

    return (
        <div className="flex-1 min-h-screen bg-main text-content p-4 pt-8 md:p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-adaptive pb-8">
                    <div className="text-start">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-content mb-2 tracking-tight">
                            {t("myGroups.title")}
                        </h2>
                        <p className="text-muted text-sm md:text-base font-medium max-w-lg">
                            {t("myGroups.subtitle")}
                        </p>
                    </div>
                    <button
                        onClick={toggleModal}
                        className="px-7 py-3.5 bg-linear-to-r from-primary to-primary/80 hover:opacity-90 text-white rounded-2xl flex items-center gap-2.5 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        <Plus size={22} strokeWidth={2.5} /> {t("myGroups.createBtn")}
                    </button>
                </div>

                {/* Filters */}
                <FilterTabs filter={filter} setFilter={setFilter} t={t} />

                {/* Grid Display */}
                {filteredGroups.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24 bg-surface rounded-3xl border border-dashed border-adaptive shadow-sm"
                    >
                        <div className="w-24 h-24 bg-main rounded-full flex items-center justify-center mb-6 border border-adaptive">
                            <Layers size={48} className="text-muted opacity-50" />
                        </div>
                        <p className="text-content text-xl font-bold mb-2">{t("myGroups.noGroups")}</p>
                        {filter === 'joined' && (
                            <Link
                                to="/groups/available"
                                className="text-primary hover:text-primary/80 font-bold flex items-center gap-2 hover:underline mt-2 transition-colors"
                            >
                                {t("myGroups.exploreLink")} <ArrowRight size={18} className="rtl:rotate-180" />
                            </Link>
                        )}
                    </motion.div>
                ) : (
                    <motion.div layout className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                            {filteredGroups.map(group => (
                                <GroupCard
                                    key={group._id}
                                    group={group}
                                    userId={userId}
                                    currentUser={currentUser}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Lazy Loaded Modal */}
                <Suspense fallback={null}>
                    <CreateGroupModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        onGroupCreated={handleGroupCreated}
                    />
                </Suspense>
            </div>
        </div>
    );
};

export default MyGroups;
