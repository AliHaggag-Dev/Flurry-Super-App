/**
 * ReportModal Component
 * ------------------------------------------------------------------
 * Modal for reporting inappropriate content.
 * Features:
 * - List of predefined reasons.
 * - Fire-and-forget submission logic with optimistic UI feedback.
 * - Prevents double-clicks via local submitting state.
 */

import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

// Icons
import { X, ShieldAlert, Flag } from "lucide-react";

// API
import api from "../../lib/axios";

const REPORT_REASONS_KEYS = [
    "spam",
    "harassment",
    "hateSpeech",
    "violence",
    "nudity",
    "other"
];

const ReportModal = ({ postId, targetId, onClose, onSuccess, onSubmit }) => {
    const { getToken } = useAuth();
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    const activePostId = postId || targetId;
    const successCallback = onSuccess || onSubmit;

    const handleReport = async (reason) => {
        // Prevent double-clicks
        if (submitting) return;
        setSubmitting(true);

        // 1. Close the modal FIRST (immediate visual feedback)
        onClose();

        // 2. Call parent callback (handles hasReported state)
        if (typeof successCallback === "function") {
            successCallback();
        }

        // 3. Show ONE toast (only here, parent should NOT show its own)
        toast.success(t("report.success"));

        // 4. Fire-and-forget API call
        try {
            const token = await getToken();
            await api.post(`/post/report/${activePostId}`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Report submission failed:", error);
        }
    };

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface border border-adaptive rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10"
            >
                {/* Header */}
                <div className="p-4 border-b border-adaptive flex justify-between items-center bg-main/50 backdrop-blur-md">
                    <h3 className="font-bold text-content flex items-center gap-2">
                        <ShieldAlert className="text-red-500" size={20} />
                        {t("report.title")}
                    </h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-1.5 hover:bg-main rounded-full text-muted transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Reasons List */}
                <div className="p-2">
                    <p className="text-sm text-muted px-4 py-2 font-medium">{t("report.subtitle")}</p>
                    <div className="flex flex-col gap-1">
                        {REPORT_REASONS_KEYS.map((reasonKey) => (
                            <button
                                key={reasonKey}
                                disabled={submitting}
                                onClick={(e) => { e.stopPropagation(); handleReport(reasonKey); }}
                                className={`w-full text-start px-4 py-3 hover:bg-main rounded-lg text-content font-medium transition flex items-center justify-between group ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {t(`report.reasons.${reasonKey}`)}
                                <Flag size={16} className="text-muted group-hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rtl:scale-x-[-1]" />
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ReportModal;