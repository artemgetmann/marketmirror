import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface AccessibleAnalysesProps {
  tickers: string[];
  resetTime?: string;
  resetInSeconds?: number;
  message?: string;
}

export default function AccessibleAnalyses({ tickers, resetTime, resetInSeconds, message }: AccessibleAnalysesProps) {
  // Don't render anything if there are no accessible tickers
  if (!tickers || tickers.length === 0) return null;
  
  // Format the reset time message
  const resetMessage = resetInSeconds 
    ? `Limit resets in ${Math.floor(resetInSeconds / 3600)} hours` 
    : 'Limit resets at midnight';

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={16} className="text-gray-500" />
        <h3 className="text-sm font-medium">
          Previously analyzed tickers
        </h3>
      </div>
      
      {message && (
        <p className="text-sm text-gray-600 mb-3">
          {message}
        </p>
      )}
      
      <div className="flex flex-wrap gap-2 mb-2">
        {tickers.map((ticker) => (
          <Link key={ticker} to={`/analysis/${ticker}`}>
            <Badge 
              variant="secondary" 
              className="hover:bg-gray-200 cursor-pointer py-1 px-3"
            >
              {ticker.toUpperCase()}
            </Badge>
          </Link>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        {resetMessage}
      </p>
    </div>
  );
}
