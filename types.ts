export interface ParsedResult {
  title: string;
  byline: string | null;
  dir: string | null;
  content: string; // HTML content
  textContent: string;
  length: number;
  excerpt: string | null;
  siteName: string | null;
}

export interface ConversionResult {
  markdown: string;
  title: string;
  url: string;
  timestamp: string;
}

export interface ProcessedLink {
  id: string;
  url: string;
  status: 'processing' | 'completed' | 'error';
  result?: ConversionResult;
  error?: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  FETCHING = 'FETCHING',
  PARSING = 'PARSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}