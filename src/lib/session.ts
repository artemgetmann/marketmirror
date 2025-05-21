/**
 * Session management utility for MarketMirror
 * Handles generating and retrieving session IDs
 */

// Generate a unique session ID or retrieve existing one
export function generateOrRetrieveSessionId(): string {
  let sessionId = localStorage.getItem('marketmirror_session_id');
  
  if (!sessionId) {
    // Generate a unique session ID with timestamp and random string
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('marketmirror_session_id', sessionId);
  }
  
  return sessionId;
}

// Get current usage information from localStorage
export function getUsageInfo(): { 
  usageCount: number; 
  usageLimit: number; 
  remainingUses: number;
} | null {
  const usageInfoStr = localStorage.getItem('marketmirror_usage_info');
  
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
  localStorage.setItem('marketmirror_usage_info', JSON.stringify(usageInfo));
}
