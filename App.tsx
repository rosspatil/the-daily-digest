import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTechNews, fetchDeepAnalysis } from './services/geminiService';
import { NewsItem, Category, NewsState, AnalysisData, SourceOption, SUB_CATEGORIES, GroundingSource, GeminiModel } from './types';
import NewsCard from './components/NewsCard';
import SourceList from './components/SourceList';
import AnalysisModal from './components/AnalysisModal';
import SettingsModal from './components/SettingsModal';
import SummaryModal from './components/SummaryModal';
import LoginGate from './components/LoginGate'; // Import LoginGate

const PRESET_SOURCES_MAP: Record<Category, SourceOption[]> = {
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
  ]
};

const ITEMS_PER_PAGE = 12;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

interface CachedData {
  items: NewsItem[];
  sources: GroundingSource[];
  timestamp: number;
  lastUpdatedStr: string;
}

interface CachedAnalysisData {
  analysis: AnalysisData;
  timestamp: number;
}

// Generic fallback SVG for favicons shared across components
const FALLBACK_FAVICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748B'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-6.5c-.83 0-1.5-.67-1.5-1.5S11.17 7 12 7s1.5.67 1.5 1.5S12.83 10 12 10z'/%3E%3C/svg%3E`;


const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('hasLoggedIn') === 'true'; // Use sessionStorage
  });

  const [state, setState] = useState<NewsState>({
    items: [],
    sources: [],
    loading: true,
    error: null,
    lastUpdated: null
  });
  
  const [isFromCache, setIsFromCache] = useState(false);
  const [showLowSignal, setShowLowSignal] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState<Category>('Technology');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  
  const [categorySources, setCategorySources] = useState<Record<Category, string[]>>({
    'Technology': [],
    'Markets': [],
    'Finance': [],
    'Politics': [],
    'Geo-politics': []
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null); // For AnalysisModal
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  const [selectedSummaryItem, setSelectedSummaryItem] = useState<NewsItem | null>(null); // For SummaryModal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(() => {
    const savedModel = localStorage.getItem('gemini_selected_model');
    // Set default model to 'gemini-flash-latest' since Gemini 3 models are removed
    return (savedModel as GeminiModel) || 'gemini-flash-latest'; 
  });

  const categories: Category[] = ['Technology', 'Markets', 'Finance', 'Politics', 'Geo-politics'];

  const sortedItems = useMemo(() => {
    const currentThreshold = showLowSignal ? 1 : 5;
    let filtered = state.items.filter(item => item.relevance >= currentThreshold);
    
    const selectedIds = categorySources[activeCategory];
    if (selectedIds.length > 0) {
      const selectedNames = PRESET_SOURCES_MAP[activeCategory]
        .filter(s => selectedIds.includes(s.id))
        .map(s => s.name.toLowerCase());
      
      filtered = filtered.filter(item => {
        const itemSource = item.source.toLowerCase();
        return selectedNames.some(name => {
           const normalizedName = name.replace(/\s/g, '');
           const normalizedItemSource = itemSource.replace(/\s/g, '');
           return normalizedItemSource.includes(normalizedName) || normalizedName.includes(normalizedItemSource);
        });
      });
    }

    return filtered.sort((a, b) => b.relevance - a.relevance);
  }, [state.items, activeCategory, categorySources, showLowSignal]);

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    
    return sortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE).map(item => {
      // Find the correct domain for the favicon
      const sourceOption = PRESET_SOURCES_MAP[item.category]?.find(
        (s) => s.name.toLowerCase() === item.source.toLowerCase()
      );
      // Fallback to a generic domain if not found, though PRESET_SOURCES_MAP should cover most
      const itemSourceDomain = sourceOption?.domain || 'example.com'; 
      return { ...item, sourceDomain: itemSourceDomain };
    });
  }, [sortedItems, currentPage]);

  const toggleSource = (id: string) => {
    setCategorySources(prev => ({
      ...prev,
      [activeCategory]: prev[activeCategory].includes(id) 
        ? prev[activeCategory].filter(s => s !== id) 
        : [...prev[activeCategory], id]
    }));
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setActiveSubCategory('All');
    setCurrentPage(1);
    setShowLowSignal(false);
  };

  const handleSubCategoryChange = (sub: string) => {
    setActiveSubCategory(sub);
    setCurrentPage(1);
    setShowLowSignal(false);
  };

  const loadNews = useCallback(async (cat: Category, subCat: string, sourceIds: string[], model: GeminiModel) => {
    const sortedSourceIds = [...sourceIds].sort().join(',');
    // Removed model from cacheKey to make it model-agnostic
    const cacheKey = `digest_cache_${cat}_${subCat}_${sortedSourceIds}`; 
    
    try {
      const cached = localStorage.getItem(cacheKey); // Changed to localStorage
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_TTL) {
          setState({
            items: parsed.items,
            sources: parsed.sources,
            loading: false,
            error: null,
            lastUpdated: parsed.lastUpdatedStr
          });
          setIsFromCache(true);
          return;
        }
      }
    } catch (e) {
      console.warn("News cache retrieval failed", e);
    }

    setIsFromCache(false);
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const currentPresetSources = PRESET_SOURCES_MAP[cat];
    const domains = currentPresetSources
      .filter(s => sourceIds.includes(s.id))
      .map(s => s.domain);

    try {
      const data = await fetchTechNews(cat, subCat, domains, model); // Pass modelName
      const lastUpdatedStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setState({
        items: data.items,
        sources: data.sources,
        loading: false,
        error: null,
        lastUpdated: lastUpdatedStr
      });

      const cachePayload: CachedData = {
        items: data.items,
        sources: data.sources,
        timestamp: Date.now(),
        lastUpdatedStr: lastUpdatedStr
      };
      localStorage.setItem(cacheKey, JSON.stringify(cachePayload)); // Changed to localStorage

    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: "Global signal synthesis is currently offline. Please refresh in a moment."
      }));
    }
  }, []);

  const handleOpenAnalysis = async (item: NewsItem) => {
    setSelectedItem(item);
    setIsAnalysisLoading(true);
    setAnalysisData(null);
    
    const analysisCacheKey = `digest_analysis_${item.id}`; // Model-agnostic for analysis cache
    try {
      const cachedAnalysis = localStorage.getItem(analysisCacheKey);
      if (cachedAnalysis) {
        const parsed: CachedAnalysisData = JSON.parse(cachedAnalysis);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_TTL) {
          setAnalysisData(parsed.analysis);
          setIsAnalysisLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Analysis cache retrieval failed", e);
    }

    try {
      const analysis = await fetchDeepAnalysis(item, selectedModel); // Pass selectedModel
      setAnalysisData(analysis);
      const cachePayload: CachedAnalysisData = {
        analysis: analysis,
        timestamp: Date.now(),
      };
      localStorage.setItem(analysisCacheKey, JSON.stringify(cachePayload));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleCloseAnalysis = () => {
    setSelectedItem(null);
    setAnalysisData(null);
  };

  const handleOpenSummary = (item: NewsItem) => {
    setSelectedSummaryItem(item);
    setShowSummaryModal(true);
  };

  const handleCloseSummary = () => {
    setSelectedSummaryItem(null);
    setShowSummaryModal(false);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('hasLoggedIn'); // Use sessionStorage
    setIsLoggedIn(false);
    setShowSettingsModal(false); // Close settings after logout
  };

  const handleClearCache = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) { // Iterate backwards to safely remove items
      const key = localStorage.key(i);
      if (key && (key.startsWith('digest_cache_') || key.startsWith('digest_analysis_'))) {
        localStorage.removeItem(key);
      }
    }
    // Only remove the selected model cache if its key pattern starts with 'gemini_selected_model'
    localStorage.removeItem('gemini_selected_model');
    alert('All news and analysis caches cleared!');
    setShowSettingsModal(false);
    // Force reload news after cache clear
    loadNews(activeCategory, activeSubCategory, categorySources[activeCategory], selectedModel);
  };

  const handleSaveSettings = (model: GeminiModel) => {
    setSelectedModel(model);
    localStorage.setItem('gemini_selected_model', model);
    setShowSettingsModal(false);
    // Force reload news with new model
    loadNews(activeCategory, activeSubCategory, categorySources[activeCategory], model);
  };

  const handleModelChangeInSettings = (model: GeminiModel) => {
    setSelectedModel(model);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadNews(activeCategory, activeSubCategory, categorySources[activeCategory], selectedModel);
    }
  }, [activeCategory, activeSubCategory, categorySources, loadNews, selectedModel, isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen pb-20">
      <AnalysisModal 
        item={selectedItem} 
        data={analysisData} 
        loading={isAnalysisLoading} 
        onClose={handleCloseAnalysis} 
      />

      {/* Corrected the typo from handleCloseCloseSummary to handleCloseSummary */}
      <SummaryModal
        isOpen={showSummaryModal}
        onClose={handleCloseSummary}
        item={selectedSummaryItem}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        selectedModel={selectedModel}
        onModelChange={handleModelChangeInSettings}
        onClearCache={handleClearCache}
        onLogout={handleLogout} // Pass handleLogout to SettingsModal
      />

      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 mb-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4"> {/* Logo and Title */}
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-lg">D</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">The Daily Digest</h1>
          </div>
          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Settings button moved to the far right */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              aria-label="Open settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="glass border-b border-white/5 px-6 py-3 mb-8 sticky top-[73px] z-40 bg-slate-900/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">Filter Topic:</span>
          {SUB_CATEGORIES[activeCategory].map((sub) => (
            <button
              key={sub}
              onClick={() => handleSubCategoryChange(sub)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                activeSubCategory === sub
                  ? 'bg-slate-700 border-emerald-500/50 text-emerald-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {activeSubCategory !== 'All' ? `${activeSubCategory} ` : ''}{activeCategory}
                </h2>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                    {showLowSignal ? 'All Signals' : 'SIG 5+ Filter'}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 max-w-2xl leading-relaxed text-sm">
                A live AI-driven scan of the last 24 hours. {showLowSignal ? 'Showing all signals detected.' : 'Showing significant signals (SIG 5+) synthesized from top global newsrooms.'}
              </p>
            </div>
            {state.lastUpdated && !state.loading && (
              <div className="flex flex-col items-end gap-1">
                <div className="text-slate-500 mono text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                  {isFromCache && (
                    <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">
                      Cached
                    </span>
                  )}
                  Last Synthesis: {state.lastUpdated}
                </div>
                <div className="flex gap-4">
                   <button 
                    onClick={() => setShowLowSignal(!showLowSignal)}
                    className="text-[9px] text-emerald-500/60 uppercase font-black tracking-widest hover:text-emerald-400 transition-colors"
                  >
                    {showLowSignal ? 'Restore Filter' : 'Include Low Signal'}
                  </button>
                  {isFromCache && (
                    <button 
                      onClick={() => {
                        const sortedSourceIds = [...categorySources[activeCategory]].sort().join(',');
                        // Removed model from cacheKey for force refresh as well
                        const cacheKey = `digest_cache_${activeCategory}_${activeSubCategory}_${sortedSourceIds}`;
                        localStorage.removeItem(cacheKey); // Changed to localStorage
                        loadNews(activeCategory, activeSubCategory, categorySources[activeCategory], selectedModel);
                      }}
                      className="text-[9px] text-emerald-500/60 uppercase font-black tracking-widest hover:text-emerald-400 transition-colors"
                    >
                      Force Refresh
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {state.error && (
            <div className="bg-rose-900/20 border border-rose-700/50 text-rose-300 p-4 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-7-9a1 1 0 011-1h.01L10 9a1 1 0 01-.01 2H4a1 1 0 01-1-1zm14 0a1 1 0 011-1h.01L10 9a1 1 0 01-.01 2H16a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              <span className="text-sm font-medium">{state.error}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0 mr-2">Filter Source:</span>
            {PRESET_SOURCES_MAP[activeCategory].map(source => (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  categorySources[activeCategory].includes(source.id)
                    ? 'bg-emerald-700 border-emerald-500/50 text-emerald-300'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <img 
                  src={`https://www.google.com/s2/favicons?sz=32&domain=${source.domain}`} 
                  className="w-3.5 h-3.5 object-contain" 
                  alt={`${source.name} favicon`}
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FAVICON_SVG; }}
                />
                {source.name}
              </button>
            ))}
          </div>

        </header>

        {state.loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse h-64 flex flex-col justify-between">
                <div>
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                  <div className="h-6 bg-slate-700 rounded mb-3"></div>
                  <div className="h-4 bg-slate-800 rounded mb-2 w-5/6"></div>
                  <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                </div>
                <div className="h-4 bg-slate-700 rounded w-1/4 self-end"></div>
              </div>
            ))}
          </div>
        )}

        {!state.loading && state.items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">No news items found for the selected criteria.</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters or category.</p>
          </div>
        )}

        {!state.loading && state.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedItems.map((item) => (
                <NewsCard 
                  key={item.id} 
                  item={item} 
                  onAnalyze={handleOpenAnalysis} 
                  onShowSummary={handleOpenSummary}
                  sourceDomain={item.sourceDomain || 'example.com'} // Pass the derived domain, with a very safe fallback
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600/30 transition-colors"
                >
                  Previous
                </button>
                <span className="text-slate-400 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600/30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}

            <SourceList sources={state.sources} />
          </>
        )}
      </main>
    </div>
  );
};

export { App }; // Export App as a named export
export default App; // Keep the default export as well