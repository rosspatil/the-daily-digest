
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTechNews, fetchDeepAnalysis } from './services/geminiService';
import { NewsItem, Category, NewsState, AnalysisData, SourceOption, SUB_CATEGORIES, GroundingSource, GeminiModel, SortBy } from './types';
import NewsCard from './components/NewsCard';
import SourceList from './components/SourceList';
import AnalysisModal from './components/AnalysisModal';
import SettingsModal from './components/SettingsModal';
import SummaryModal from './components/SummaryModal';
import LoginGate from './components/LoginGate';

// Define the fallback favicon SVG to be used when source icons fail to load
const FALLBACK_FAVICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748B'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-6.5c-.83 0-1.5-.67-1.5-1.5S11.17 7 12 7s1.5.67 1.5 1.5S12.83 10 12 10z'/%3E%3C/svg%3E`;

const PRESET_SOURCES_MAP: Record<Category, SourceOption[]> = {
  'Markets': [
    { id: 'moneycontrol', name: 'Moneycontrol', domain: 'moneycontrol.com' },
    { id: 'marketwatch', name: 'MarketWatch', domain: 'marketwatch.com' },
    { id: 'cnbc-mkt', name: 'CNBC Markets', domain: 'cnbc.com' },
    { id: 'reuters-mkt', name: 'Reuters Markets', domain: 'reuters.com' },
    { id: 'yfinance-mkt', name: 'Yahoo Finance', domain: 'finance.yahoo.com' },
    { id: 'investing', name: 'Investing.com', domain: 'investing.com' },
    { id: 'nasdaq', name: 'Nasdaq', domain: 'nasdaq.com' },
    { id: 'mktscr', name: 'MarketScreener', domain: 'marketscreener.com' },
  ],
  'Finance': [
    { id: 'finimize', name: 'Finimize', domain: 'finimize.com' },
    { id: 'cnbc-biz', name: 'CNBC Business', domain: 'cnbc.com' },
    { id: 'yfinance', name: 'Yahoo Finance', domain: 'finance.yahoo.com' },
    { id: 'investopedia', name: 'Investopedia', domain: 'investopedia.com' },
    { id: 'bizinsider', name: 'Business Insider', domain: 'businessinsider.com' },
    { id: 'fortune', name: 'Fortune', domain: 'fortune.com' },
    { id: 'morningstar', name: 'Morningstar', domain: 'morningstar.com' },
  ],
  'Technology': [
    { id: 'techmeme', name: 'Techmeme', domain: 'techmeme.com' },
    { id: 'techcrunch', name: 'TechCrunch', domain: 'techcrunch.com' },
    { id: 'theverge', name: 'The Verge', domain: 'theverge.com' },
    { id: 'arstechnica', name: 'Ars Technica', domain: 'arstechnica.com' },
    { id: 'engadget', name: 'Engadget', domain: 'engadget.com' },
    { id: 'wired', name: 'Wired', domain: 'wired.com' },
    { id: 'hn', name: 'Hacker News', domain: 'news.ycombinator.com' },
  ],
  'Professional': [
    { id: 'go-blog', name: 'Go Blog', domain: 'go.dev' },
    { id: 'medium-go', name: 'Medium Golang', domain: 'medium.com' },
    { id: 'zendesk-ai', name: 'Zendesk Blog', domain: 'zendesk.com' },
    { id: 'intercom-ai', name: 'Intercom Blog', domain: 'intercom.com' },
    { id: 'aws-blog', name: 'AWS News Blog', domain: 'aws.amazon.com' },
    { id: 'azure-blog', name: 'Azure Blog', domain: 'azure.microsoft.com' },
    { id: 'gcp-blog', name: 'Google Cloud Blog', domain: 'cloud.google.com' },
    { id: 'techcrunch-cloud', name: 'TechCrunch', domain: 'techcrunch.com' },
    { id: 'hbr-lead', name: 'HBR Leadership', domain: 'hbr.org' },
    { id: 'manager-tools', name: 'Manager Tools', domain: 'manager-tools.com' },
    { id: 'firstround-rev', name: 'First Round Review', domain: 'firstround.com' },
  ],
  'Politics': [
    { id: 'politico', name: 'Politico', domain: 'politico.com' },
    { id: 'npr-pol', name: 'NPR Politics', domain: 'npr.org' },
    { id: 'thehindu', name: 'The Hindu', domain: 'thehindu.com' },
    { id: 'scroll', name: 'Scroll.in', domain: 'scroll.in' },
    { id: 'axios', name: 'Axios', domain: 'axios.com' },
    { id: 'thehill', name: 'The Hill', domain: 'thehill.com' },
    { id: 'independent', name: 'Independent', domain: 'independent.co.uk' },
  ],
  'Geo-politics': [
    { id: 'aljazeera-geo', name: 'Al Jazeera', domain: 'aljazeera.com' },
    { id: 'dw', name: 'DW News', domain: 'dw.com' },
    { id: 'france24', name: 'France 24', domain: 'france24.com' },
    { id: 'cfr', name: 'CFR', domain: 'cfr.org' },
    { id: 'euronews', name: 'EuroNews', domain: 'euronews.com' },
    { id: 'reuters-intl', name: 'Reuters World', domain: 'reuters.com' },
    { id: 'fp', name: 'Foreign Policy', domain: 'foreignpolicy.com' },
  ],
};

const ITEMS_PER_PAGE = 12;
const CACHE_TTL = 6 * 60 * 60 * 1000;

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => sessionStorage.getItem('hasLoggedIn') === 'true');
  const [state, setState] = useState<NewsState>({ items: [], sources: [], loading: true, error: null, lastUpdated: null });
  const [isFromCache, setIsFromCache] = useState(false);
  const [showLowSignal, setShowLowSignal] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  
  // Reordered sequence: Market, Finance, Technology, Professional, Politics, Geo-politics
  const categories: Category[] = ['Markets', 'Finance', 'Technology', 'Professional', 'Politics', 'Geo-politics'];
  const [activeCategory, setActiveCategory] = useState<Category>('Markets');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  const [categorySources, setCategorySources] = useState<Record<Category, string[]>>({
    'Markets': [], 'Finance': [], 'Technology': [], 'Professional': [], 'Politics': [], 'Geo-politics': [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<NewsItem | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(() => {
    const saved = localStorage.getItem('gemini_selected_model');
    return (saved as GeminiModel) || 'gemini-3-flash-preview'; 
  });

  const sortedItems = useMemo(() => {
    const threshold = showLowSignal ? 1 : 5;
    let filtered = state.items.filter(item => item.relevance >= threshold);
    
    const selectedIds = categorySources[activeCategory];
    if (selectedIds.length > 0) {
      const selectedNames = PRESET_SOURCES_MAP[activeCategory]
        .filter(s => selectedIds.includes(s.id))
        .map(s => s.name.toLowerCase());
      
      filtered = filtered.filter(item => {
        const itemSource = item.source.toLowerCase();
        return selectedNames.some(name => {
           const normName = name.replace(/\s/g, '');
           const normSource = itemSource.replace(/\s/g, '');
           return normSource.includes(normName) || normName.includes(normSource);
        });
      });
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return b.relevance - a.relevance;
    });
  }, [state.items, activeCategory, categorySources, showLowSignal, sortBy]);

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE).map(item => {
      const sourceOption = PRESET_SOURCES_MAP[item.category as Category]?.find(s => s.name.toLowerCase() === item.source.toLowerCase());
      
      let domain = sourceOption?.domain;
      if (!domain && item.uri) {
        try {
          domain = new URL(item.uri).hostname.replace('www.', '');
        } catch (e) {
          domain = 'news-source.com';
        }
      }
      
      return { ...item, sourceDomain: domain || 'news-source.com' };
    });
  }, [sortedItems, currentPage]);

  const toggleSource = (id: string) => {
    setCategorySources(prev => ({
      ...prev, [activeCategory]: prev[activeCategory].includes(id) ? prev[activeCategory].filter(s => s !== id) : [...prev[activeCategory], id]
    }));
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setActiveSubCategory('All');
    setCurrentPage(1);
    setShowLowSignal(false);
  };

  const loadNews = useCallback(async (cat: Category, subCat: string, sourceIds: string[], model: GeminiModel) => {
    const cacheKey = `digest_cache_${cat}_${subCat}_${[...sourceIds].sort().join(',')}`; 
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setState({ items: parsed.items, sources: parsed.sources, loading: false, error: null, lastUpdated: parsed.lastUpdatedStr });
          setIsFromCache(true);
          return;
        }
      }
    } catch (e) {}

    setIsFromCache(false);
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const currentPresetSources = PRESET_SOURCES_MAP[cat];
      const domains = currentPresetSources.filter(s => sourceIds.includes(s.id)).map(s => s.domain);
      const data = await fetchTechNews(cat, subCat, domains, model);
      const lastUpdatedStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setState({ items: data.items, sources: data.sources, loading: false, error: null, lastUpdated: lastUpdatedStr });
      localStorage.setItem(cacheKey, JSON.stringify({ items: data.items, sources: data.sources, timestamp: Date.now(), lastUpdatedStr }));
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  const handleOpenAnalysis = async (item: NewsItem) => {
    setSelectedItem(item);
    setIsAnalysisLoading(true);
    setAnalysisData(null);
    try {
      const data = await fetchDeepAnalysis(item, selectedModel);
      setAnalysisData(data);
    } catch (err) {} finally { setIsAnalysisLoading(false); }
  };

  useEffect(() => {
    if (isLoggedIn) loadNews(activeCategory, activeSubCategory, categorySources[activeCategory], selectedModel);
  }, [activeCategory, activeSubCategory, categorySources, loadNews, selectedModel, isLoggedIn]);

  if (!isLoggedIn) return <LoginGate onLoginSuccess={() => setIsLoggedIn(true)} />;

  return (
    <div className="min-h-screen pb-20">
      <AnalysisModal item={selectedItem} data={analysisData} loading={isAnalysisLoading} onClose={() => setSelectedItem(null)} />
      <SummaryModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)} item={selectedSummaryItem} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} onSave={(m) => { setSelectedModel(m); localStorage.setItem('gemini_selected_model', m); setShowSettingsModal(false); }} selectedModel={selectedModel} onModelChange={setSelectedModel} onClearCache={() => localStorage.clear()} onLogout={() => { sessionStorage.clear(); setIsLoggedIn(false); }} />

      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 mb-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"><span className="text-white font-black text-lg">D</span></div>
            <h1 className="text-xl font-bold tracking-tight text-white">The Daily Digest</h1>
          </div>
          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 md:pb-0">
            {categories.map((cat) => (
              <button key={cat} onClick={() => handleCategoryChange(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{cat}</button>
            ))}
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
        </div>
      </nav>

      <div className="glass border-b border-white/5 px-6 py-3 mb-8 sticky top-[73px] z-40 bg-slate-900/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">Filter Topic:</span>
          {SUB_CATEGORIES[activeCategory].map((sub) => (
            <button key={sub} onClick={() => setActiveSubCategory(sub)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${activeSubCategory === sub ? 'bg-slate-700 border-emerald-500/50 text-emerald-400' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}>{sub}</button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">{activeSubCategory !== 'All' ? `${activeSubCategory} ` : ''}{activeCategory}</h2>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">{sortBy === 'newest' ? 'Most Recent' : 'High Relevance'}</span>
                </div>
              </div>
              <p className="text-slate-400 max-w-2xl text-sm">Synthetic scan of the last 24 hours. Filtering for significance and precision.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-slate-500 mono text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                {isFromCache && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">Cached</span>}
                Last Sync: {state.lastUpdated}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setSortBy(sortBy === 'relevance' ? 'newest' : 'relevance')} className="text-[9px] text-emerald-500/60 uppercase font-black tracking-widest hover:text-emerald-400 transition-colors">
                  Sort: {sortBy === 'relevance' ? 'By Time' : 'By Relevance'}
                </button>
                <button onClick={() => setShowLowSignal(!showLowSignal)} className="text-[9px] text-emerald-500/60 uppercase font-black tracking-widest hover:text-emerald-400 transition-colors">
                  {showLowSignal ? 'High Signal Only' : 'Show Low Signal'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0 mr-2">Sources:</span>
            {PRESET_SOURCES_MAP[activeCategory].map(source => (
              <button key={source.id} onClick={() => toggleSource(source.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${categorySources[activeCategory].includes(source.id) ? 'bg-emerald-700 border-emerald-500/50 text-emerald-300' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                <img src={`https://www.google.com/s2/favicons?sz=32&domain=${source.domain}`} className="w-3.5 h-3.5 object-contain" alt="" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FAVICON_SVG; }} />
                {source.name}
              </button>
            ))}
          </div>
        </header>

        {state.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <div key={i} className="glass p-6 rounded-2xl animate-pulse h-64" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedItems.map((item) => <NewsCard key={item.id} item={item} onAnalyze={handleOpenAnalysis} onShowSummary={(it) => { setSelectedSummaryItem(it); setShowSummaryModal(true); }} sourceDomain={item.sourceDomain || 'example.com'} />)}
            </div>
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg disabled:opacity-50">Prev</button>
                <span className="text-slate-400 text-sm">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg disabled:opacity-50">Next</button>
              </div>
            )}
            <SourceList sources={state.sources} />
          </>
        )}
      </main>
    </div>
  );
};

export { App };
export default App;
