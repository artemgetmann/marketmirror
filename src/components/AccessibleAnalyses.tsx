// This file is no longer used - functionality moved directly into EmailCaptureModal
// Keeping as a stub to avoid breaking imports

import React from 'react';

interface AccessibleAnalysesProps {
  tickers: string[];
  message?: string;
  resetTime?: string;
  resetInSeconds?: number;
}

const AccessibleAnalyses: React.FC<AccessibleAnalysesProps> = ({ 
  tickers, 
  message = "Previously analyzed tickers:",
  resetTime,
  resetInSeconds
}) => {
  // Component functionality has been moved directly into EmailCaptureModal
  return null;
};

export default AccessibleAnalyses;
