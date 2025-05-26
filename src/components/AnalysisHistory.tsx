import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

interface AnalysisHistoryProps {
  tickers: string[];
  currentTicker?: string;
  className?: string;
}

export default function AnalysisHistory({ tickers, currentTicker, className = '' }: AnalysisHistoryProps) {
  // Don't render if no tickers or only the current ticker
  if (!tickers || tickers.length === 0 || (tickers.length === 1 && tickers[0] === currentTicker)) {
    return null;
  }
  
  // Filter out current ticker from the list
  const filteredTickers = tickers.filter(ticker => ticker !== currentTicker);
  
  if (filteredTickers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <History size={14} />
        <span>History</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filteredTickers.map((ticker) => (
          <Link key={ticker} to={`/analysis/${ticker}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 py-1 px-2 text-xs">
              {ticker.toUpperCase()}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
