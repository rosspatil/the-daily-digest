
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  subCategory?: string;
  source: string;
  relevance: number;
  uri: string;
  sourceDomain?: string;
  publishedAt: string; // ISO 8601 string for sorting
  publishedAtDisplay: string; // "10 mins ago", "Today, 4:00 PM", etc.
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

export type Category = 'Markets' | 'Finance' | 'Technology' | 'Professional' | 'Politics' | 'Geo-politics';

export const SUB_CATEGORIES: Record<Category, string[]> = {
  'Markets': ['All', 'Equities', 'Commodities', 'Currencies', 'Bonds'],
  'Finance': ['All', 'Economy', 'Banking', 'Fintech', 'Crypto'],
  'Technology': ['All', 'AI', 'Startups', 'Hardware', 'Software', 'Cybersecurity'],
  'Professional': ['Golang', 'Customer Support AI', 'Cloud Computing', 'Leadership'],
  'Politics': ['All', 'India', 'EU', 'US'],
  'Geo-politics': ['All', 'Diplomacy', 'Conflict', 'Trade']
};

export type GeminiModel = 'gemini-flash-lite-latest' | 'gemini-flash-latest' | 'gemini-3-flash-preview';
export type SortBy = 'relevance' | 'newest';
