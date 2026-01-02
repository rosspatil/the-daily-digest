import React from 'react';
import { NewsItem } from '../types';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: NewsItem | null;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      
      <div className="relative glass w-full max-w-xl max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl border border-white/10 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1 block">Full Summary</span>
            <h2 id="summary-title" className="text-xl font-bold text-white leading-tight pr-4">{item.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            aria-label="Close summary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-slate-300 leading-relaxed text-base">
            {item.summary}
          </p>
          <div className="mt-6 pt-4 border-t border-white/10 text-right">
            <span className="text-xs font-medium text-slate-500">Source: {item.source}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;