
import React from 'react';
import { NewsItem, AnalysisData } from '../types';

interface AnalysisModalProps {
  item: NewsItem | null;
  data: AnalysisData | null;
  loading: boolean;
  onClose: () => void;
}

// Simple markdown renderer for blog-like presentation
const renderMarkdown = (markdown: string | undefined) => {
  if (!markdown) return null;

  const lines = markdown.split('\n');
  const elements: React.JSX.Element[] = []; // Explicitly use React.JSX.Element
  let currentListItems: React.JSX.Element[] = [];
  let inList = false;

  const closeListIfOpen = (currentIdx: number) => {
    if (inList) {
      elements.push(
        <ul key={`ul-block-${currentIdx}`} className="list-disc list-inside text-slate-300 text-base space-y-1 mt-2 mb-2">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    // Headings
    if (line.startsWith('## ')) {
      closeListIfOpen(index);
      elements.push(<h3 key={index} className="text-lg font-bold text-white mb-2 mt-4">{line.substring(3)}</h3>);
    }
    // Bullet points
    else if (line.startsWith('* ')) {
      if (!inList) {
        inList = true;
      }
      // Basic bolding within list items
      const listItemContent = line.substring(2).split('**').map((segment, i) => (
        i % 2 === 1 ? <strong key={`bold-${index}-${i}`}>{segment}</strong> : segment
      ));
      currentListItems.push(<li key={`li-${index}`}>{listItemContent}</li>);
    }
    // Paragraphs (and basic bolding within paragraphs)
    else if (line.trim() !== '') {
      closeListIfOpen(index);
      const paragraphContent = line.split('**').map((segment, i) => (
        i % 2 === 1 ? <strong key={`bold-${index}-${i}`}>{segment}</strong> : segment
      ));
      elements.push(<p key={index} className="text-slate-300 leading-relaxed text-base mb-2">{paragraphContent}</p>);
    } else { // Empty line
      closeListIfOpen(index); // Close any open list
      // Optionally add a <br/> or empty paragraph for spacing, or nothing.
      // For now, we just ensure lists are closed.
    }
  });

  // Ensure any open list is closed after the loop finishes
  closeListIfOpen(lines.length);

  return <>{elements}</>;
};


const AnalysisModal: React.FC<AnalysisModalProps> = ({ item, data, loading, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      
      <div className="relative glass w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl border border-white/10 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1 block">Digest Strategic Analysis</span>
            <h2 className="text-xl font-bold text-white line-clamp-1">{item.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            aria-label="Close strategic analysis"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 animate-pulse font-medium">Synthesizing market signals and technical reports...</p>
            </div>
          ) : data ? (
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Strategic Impact
                </h3>
                {renderMarkdown(data.marketImpact)}
              </section>

              <section className="mt-8">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Contextual Drivers
                </h3>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                  {renderMarkdown(data.technicalContext)}
                </div>
              </section>

              <section className="mt-8">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Future Outlook (6M)
                </h3>
                {renderMarkdown(data.futureOutlook)}
              </section>

              {data.sources.length > 0 && (
                <div className="pt-6 border-t border-white/10 mt-8">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Grounding Verification</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.sources.map((s, idx) => (
                      <a 
                        key={idx} 
                        href={s.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all"
                        aria-label={`View source: ${s.title || new URL(s.uri).hostname}`}
                      >
                        {new URL(s.uri).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-rose-400">Strategic synthesis failed for this item.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;