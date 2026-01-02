import React from 'react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
  onAnalyze: (item: NewsItem) => void;
  onShowSummary: (item: NewsItem) => void;
  sourceDomain: string; // Re-added prop for the correct domain
}

// Generic fallback SVG for favicons
const FALLBACK_FAVICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748B'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-6.5c-.83 0-1.5-.67-1.5-1.5S11.17 7 12 7s1.5.67 1.5 1.5S12.83 10 12 10z'/%3E%3C/svg%3E`;

const NewsCard: React.FC<NewsCardProps> = ({ item, onAnalyze, onShowSummary, sourceDomain }) => {
  return (
    <div className="glass p-6 rounded-2xl hover:border-emerald-500/50 transition-all duration-300 group flex flex-col h-full border border-white/5 relative overflow-hidden">
      {/* Visual priority indicator */}
      {item.relevance > 8 && (
        <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500/40 blur-[2px] pointer-events-none" />
      )}
      
      <div className="flex justify-between items-start mb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
              <img 
                src={`https://www.google.com/s2/favicons?sz=64&domain=${sourceDomain}`} 
                className="w-4 h-4 object-contain" 
                alt={`${item.source} favicon`}
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FAVICON_SVG; }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              {item.source}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-emerald-400">
              {item.subCategory || 'General'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className={`text-[10px] font-black tracking-tighter ${item.relevance > 7 ? 'text-emerald-500' : 'text-slate-500'}`}>
            SIG {item.relevance}/10
          </span>
          <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full rounded-full ${item.relevance > 8 ? 'bg-emerald-500' : 'bg-emerald-500/50'}`} 
              style={{ width: `${item.relevance * 10}%` }} 
            />
          </div>
        </div>
      </div>

      <button 
        onClick={() => onShowSummary(item)}
        className="text-[17px] font-bold text-left text-white mb-3 group-hover:text-emerald-400 transition-colors leading-tight cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded -ml-1 pr-1"
        aria-label={`View full summary of ${item.title}`}
      >
        {item.title}
      </button>
      
      <p className="text-slate-400 text-sm leading-relaxed flex-grow line-clamp-3 mb-6">
        {item.summary}
      </p>

      <div className="mt-auto pt-4 border-t border-white/5 flex justify-end">
        <button 
          onClick={() => onAnalyze(item)}
          className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-300 flex items-center gap-1.5 transition-all group/btn"
          aria-label={`Get strategic analysis for ${item.title}`}
        >
          <span className="group-hover/btn:mr-1 transition-all">Strategic Analysis</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NewsCard;