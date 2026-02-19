/**
 * Session management utility for MarketMirror
 * Handles generating and retrieving session IDs
 */

// Storage keys for better consistency
const SESSION_ID_KEY = 'marketmirror_session_id';
const USAGE_INFO_KEY = 'marketmirror_usage_info';
const ACCESSIBLE_ANALYSES_KEY = 'marketmirror_accessible_analyses';

// Generate a unique session ID or retrieve existing one
export function generateOrRetrieveSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    // Generate a unique session ID with timestamp and random string
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
}

// Get current usage information from localStorage
export function getUsageInfo(): { 
  usageCount: number; 
  usageLimit: number; 
  remainingUses: number;
} | null {
  const usageInfoStr = localStorage.getItem(USAGE_INFO_KEY);
  
  if (!usageInfoStr) {
    return null;
  }
  
  try {
    return JSON.parse(usageInfoStr);
  } catch (e) {
    console.error('Failed to parse usage info:', e);
    return null;
  }
}

// Save usage information to localStorage
export function saveUsageInfo(usageInfo: {
  usageCount: number;
  usageLimit: number;
  remainingUses: number;
}): void {
  localStorage.setItem(USAGE_INFO_KEY, JSON.stringify(usageInfo));
}

// Save accessible analyses to localStorage
export function saveAccessibleAnalyses(tickers: string[]): void {
  // Make sure we only save unique tickers
  const uniqueTickers = [...new Set(tickers)];
  localStorage.setItem(ACCESSIBLE_ANALYSES_KEY, JSON.stringify(uniqueTickers));
}

// Get accessible analyses from localStorage
export function getAccessibleAnalyses(): string[] {
  const data = localStorage.getItem(ACCESSIBLE_ANALYSES_KEY);
  return data ? JSON.parse(data) : [];
}

// Add a single ticker to accessible analyses
export function addToAccessibleAnalyses(ticker: string): void {
  const analyses = getAccessibleAnalyses();
  if (!analyses.includes(ticker)) {
    analyses.push(ticker);
    saveAccessibleAnalyses(analyses);
  }
}