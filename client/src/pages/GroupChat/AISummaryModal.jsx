import React from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X } from "lucide-react";

const AISummaryModal = React.memo(({ showSummaryModal, setShowSummaryModal, summaryText }) => (
    <AnimatePresence>
        {showSummaryModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSummaryModal(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-border-adaptive">
                    <div className="bg-primary p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2"><Bot size={24} /><h3 className="font-bold text-lg">AI Summary</h3></div>
                        <button onClick={() => setShowSummaryModal(false)} className="p-1 hover:bg-white/20 rounded-full transition"><X size={20} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar text-content">
                        {summaryText ? (
                            <div className="prose dark:prose-invert max-w-none text-content">
                                {summaryText.split('\n').map((line, i) => (<p key={i} className="mb-2 leading-relaxed">{line}</p>))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-muted"><p>No summary available.</p></div>
                        )}
                    </div>
                    <div className="p-4 bg-main border-t border-adaptive flex justify-end">
                        <button onClick={() => setShowSummaryModal(false)} className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition shadow-sm font-medium">Close</button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
));

AISummaryModal.displayName = "AISummaryModal";

export default AISummaryModal;
