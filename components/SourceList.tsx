

import React from 'react';
import { GroundingSource } from '../types';

interface SourceListProps {
  sources: GroundingSource[];
}

// Generic fallback SVG for favicons
const FALLBACK_FAVICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748B'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-6.5c-.83 0-1.5-.67-1.5-1.5S11.17 7 12 7s1.5.67 1.5 1.5S12.83 10 12 10z'/%3E%3C/svg%3E`;

const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-12 mb-8">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        Grounding Sources
      </h3>
      <div className="flex flex-wrap gap-3">
        {sources.map((source, idx) => {
          const isTechmeme = source.uri.toLowerCase().includes('techmeme.com');
          const domain = new URL(source.uri).hostname; // Extract domain from URI
          return (
            <a
              key={idx}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className={`glass px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                isTechmeme 
                  ? 'border-blue-500/50 text-blue-100 ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'text-slate-300 hover:text-white hover:border-blue-500/50'
              }`}
            >
              <img 
                src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`} 
                className="w-3.5 h-3.5 object-contain" 
                alt={`${source.title || domain} favicon`}
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FAVICON_SVG; }}
              />
              <span className="flex items-center gap-2">
                {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                {isTechmeme && (
                  <span className="bg-blue-600/20 text-blue-400 text-[8px] px-1 rounded border border-blue-500/30 font-black tracking-tighter">
                    PRIME
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default SourceList;