import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnalysisSection } from "@/components/AnalysisSection";
import Logo from "@/components/Logo";
import { ChartCandlestick, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalysisData {
  success: boolean;
  ticker: string;
  analysis: string;
  fromCache?: boolean;
  error?: string;
}

interface FetchAnalysisOptions {
  bypassCache?: boolean;
}

const fetchAnalysis = async (ticker: string, options?: FetchAnalysisOptions): Promise<AnalysisData> => {
  const response = await fetch("https://marketmirror-api.onrender.com/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      ticker,
      bypassCache: options?.bypassCache 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch analysis");
  }

  return await response.json();
};

// Helper function to determine if content is a number, percentage, or ratio
const isNumeric = (text: string): boolean => {
  return /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?%?$/.test(text.trim()) || 
         /^\d+\.\d+[BMK]?$/.test(text.trim()) ||  // Handle values like 1125.72B
         text.trim() === 'N/A' || 
         text.trim() === '-';
};

// Detect if a text content is a company ticker
const isCompanyTicker = (text: string): boolean => {
  const tickers = ['TSLA', 'GM', 'F', 'NIO', 'RIVN', 'AAPL', 'MSFT', 'GOOG', 'AMZN'];
  const normalizedText = text.trim().toUpperCase();
  return tickers.some(ticker => normalizedText === ticker);
};

// Detect if this is a Market Cap or financial value that needs special handling
const isFinancialValue = (content: string): boolean => {
  return content.includes('Market Cap') || 
         content.includes('Option/Short') || 
         content.includes('Yes / Yes') || 
         content.includes('Yes/Yes') ||
         /\d+\.\d+B/.test(content) ||  // Values like 1125.72B
         content.endsWith('B');        // Values ending with B (billion)
};

// Detect table type from headers
const detectTableType = (headers: React.ReactNode[]): 'analysis' | 'comparison' | 'regular' => {
  const headerTexts = headers.map(h => String(h));
  
  // Check for comparison table
  if (headerTexts.includes('Company') && 
      (headerTexts.includes('P/E Ratio') || headerTexts.includes('P/S Ratio') || 
       headerTexts.includes('Market Cap (B)') || headerTexts.includes('Profit Margin'))) {
    return 'comparison';
  }
  
  // Check for analysis table
  if ((headerTexts.includes('Metric') || headerTexts.includes('Value')) && 
      (headerTexts.includes('Commentary') || headerTexts.includes('Assessment') || 
       headerTexts.includes('Commentary / Assessment') || headerTexts.includes('Commentary / Qualitative Assessment'))) {
    return 'analysis';
  }
  
  return 'regular';
};

const Analysis = () => {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Store table headers to identify table types
  const [tableHeaders, setTableHeaders] = useState<Record<string, React.ReactNode[]>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analysis", ticker],
    queryFn: () => fetchAnalysis(ticker),
    retry: 1,
    enabled: !!ticker,
  });

  const handleRefreshAnalysis = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const freshData = await fetchAnalysis(ticker, { bypassCache: true });
      // Force a refetch to update the cache with new data
      await refetch();
      
      toast({
        title: "Analysis Refreshed",
        description: "Fresh data has been fetched successfully.",
      });
    } catch (err) {
      toast({
        title: "Refresh Failed",
        description: (err as Error)?.message || "Failed to refresh analysis",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to fetch analysis",
        variant: "destructive",
      });
    }
  }, [isError, error]);

  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-medium">MarketMirror</h1>
        </div>
        <Link to="/">
          <Button variant="outline">New Analysis</Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-medium">
            {ticker} Analysis
          </h2>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ChartCandlestick className="animate-spin h-16 w-16 text-black mb-4" />
            <p className="text-xl text-gray-600">Analyzing {ticker}...</p>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-xl font-medium text-red-800 mb-2">Analysis Failed</h3>
            <p className="text-red-600 mb-4">
              {(error as Error)?.message || `Failed to analyze ${ticker}`}
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-2">
                Try Another Ticker
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="relative">
            <AnalysisSection
              title={`${data.ticker} Analysis Results`}
              content={
                <div className="prose max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Table component with unique ID
                      table: ({node, children, ...props}) => {
                        const tableId = `table-${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Extract and store headers for this table when it renders
                        useEffect(() => {
                          // Find headers in the children
                          const headers: React.ReactNode[] = [];
                          if (Array.isArray(children) && children.length > 0) {
                            const thead = children.find((child: any) => child?.props?.node?.tagName === 'thead');
                            if (thead && thead.props.children) {
                              const headerRow = Array.isArray(thead.props.children) 
                                ? thead.props.children[0] 
                                : thead.props.children;
                              
                              if (headerRow && headerRow.props && headerRow.props.children) {
                                const headerCells = Array.isArray(headerRow.props.children) 
                                  ? headerRow.props.children 
                                  : [headerRow.props.children];
                                
                                headerCells.forEach((cell: any) => {
                                  if (cell && cell.props && cell.props.children) {
                                    headers.push(cell.props.children);
                                  }
                                });
                              }
                            }
                          }
                          
                          if (headers.length > 0) {
                            setTableHeaders(prev => ({...prev, [tableId]: headers}));
                          }
                        }, []);
                        
                        return (
                          <div className="table-container">
                            <table data-table-id={tableId} {...props}>{children}</table>
                          </div>
                        );
                      },
                      
                      // Table header cell
                      th: ({node, children, ...props}) => {
                        const content = String(children);
                        const tableNode = node as any;
                        const parentNode = tableNode?.parent as any;
                        const tableId = tableNode?.properties?.['data-table-id'] || 
                                       parentNode?.properties?.['data-table-id'] || '';
                        const tableType = tableHeaders[tableId] 
                          ? detectTableType(tableHeaders[tableId]) 
                          : 'regular';
                          
                        // Default alignment is centered for all headers
                        const style = { textAlign: 'center' as const, fontWeight: 600 };
                        
                        return <th style={style} {...props}>{children}</th>;
                      },
                      
                      // Table data cell with smart alignment
                      td: ({node, children, ...props}) => {
                        const content = String(children);
                        const tableNode = node as any;
                        const parentNode = tableNode?.parent as any;
                        const tableId = tableNode?.properties?.['data-table-id'] || 
                                       parentNode?.properties?.['data-table-id'] || '';
                        const tableType = tableHeaders[tableId] 
                          ? detectTableType(tableHeaders[tableId]) 
                          : 'regular';
                        
                        // Get column index
                        const parentRow = parentNode;
                        const cellIndex = parentRow?.children ? Array.from(parentRow.children).indexOf(tableNode) : 0;
                        const isFirstColumn = cellIndex === 0;
                        const isLastColumn = parentRow?.children ? cellIndex === Array.from(parentRow.children).length - 1 : false;
                        
                        // Default style
                        let style: React.CSSProperties = { 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word' 
                        };
                        
                        // Analysis table formatting
                        if (tableType === 'analysis') {
                          // Category/Metric column (first two columns) - left aligned
                          if (isFirstColumn || cellIndex === 1) {
                            style.textAlign = 'left';
                          } 
                          // Value column (usually 3rd column) - center aligned
                          else if (cellIndex === 2 || isNumeric(content) || content === '-' || content.includes('/') || isFinancialValue(content)) {
                            style.textAlign = 'center';
                          } 
                          // Commentary/Assessment column - left aligned with text wrapping
                          else if (isLastColumn || content.length > 30) {
                            style.textAlign = 'left';
                          }
                        }
                        // Competitor comparison table formatting
                        else if (tableType === 'comparison') {
                          // Company column - always center aligned for both header and company names
                          if (isFirstColumn || isCompanyTicker(content)) {
                            style.textAlign = 'center';
                          } 
                          // All value columns - center aligned
                          else if (isNumeric(content) || content === '-' || content === 'N/A' || isFinancialValue(content)) {
                            style.textAlign = 'center';
                          }
                          // Default center alignment for all cells in comparison tables
                          else {
                            style.textAlign = 'center';
                          }
                        }
                        // Regular table - smart alignment based on content
                        else {
                          if (isCompanyTicker(content)) {
                            style.textAlign = 'center';
                          } else if (isNumeric(content) || content === '-' || content === 'N/A' || isFinancialValue(content)) {
                            style.textAlign = 'center';
                          } else if (content.length > 30) {
                            style.textAlign = 'left';
                          } else {
                            style.textAlign = 'left';
                          }
                        }
                        
                        return <td style={style} {...props}>{children}</td>;
                      }
                    }}
                  >
                    {data.analysis}
                  </ReactMarkdown>
                </div>
              }
            />
            
            {/* Refresh Analysis Button */}
            <div className="flex justify-end mt-6 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRefreshAnalysis}
                      disabled={isRefreshing}
                      variant={data.fromCache ? "default" : "outline"}
                      size="sm"
                      className={`gap-2 ${data.fromCache ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : ''}`}
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? "Refreshing..." : "Refresh Analysis"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Get fresh analysis (bypasses cache)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Cached indicator */}
            {data.fromCache && (
              <div className="text-xs text-gray-500 text-right mt-1 italic">
                Analysis from cache
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;
