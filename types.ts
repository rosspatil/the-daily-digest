

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  subCategory?: string;
  source: string;
  relevance: number;
  sourceDomain?: string; // Re-add this for favicon resolution
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisData {
  marketImpact: string;
  technicalContext: string;
  futureOutlook: string;
  sources: GroundingSource[];
}

export interface SourceOption {
  id: string;
  name: string;
  domain: string;
}

export interface NewsState {
  items: NewsItem[];
  sources: GroundingSource[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export type Category = 'Politics' | 'Geo-politics' | 'Markets' | 'Finance' | 'Technology';

export const SUB_CATEGORIES: Record<Category, string[]> = {
  'Politics': ['All', 'India', 'EU', 'US'],
  'Geo-politics': ['All', 'Diplomacy', 'Conflict', 'Trade'],
  'Markets': ['All', 'Equities', 'Commodities', 'Currencies', 'Bonds'],
  'Finance': ['All', 'Economy', 'Banking', 'Fintech', 'Crypto'],
  'Technology': ['All', 'AI', 'Startups', 'Hardware', 'Software', 'Cybersecurity']
};

export type GeminiModel = 'gemini-flash-lite-latest' | 'gemini-flash-latest' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview';