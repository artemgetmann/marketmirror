import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnalysisSection } from "@/components/AnalysisSection";
import Logo from "@/components/Logo";
import { ChartCandlestick } from "lucide-react";

interface AnalysisData {
  success: boolean;
  ticker: string;
  analysis: string;
  error?: string;
}

const fetchAnalysis = async (ticker: string): Promise<AnalysisData> => {
  const response = await fetch("https://marketmirror-api.onrender.com/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticker }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch analysis");
  }

  return await response.json();
};

const Analysis = () => {
  const { ticker = "" } = useParams<{ ticker: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analysis", ticker],
    queryFn: () => fetchAnalysis(ticker),
    retry: 1,
    enabled: !!ticker,
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to fetch analysis",
        variant: "destructive",
      });
    }
  }, [isError, error]);

  // Function to detect if we're in a comparison table based on headers
  const isComparisonTable = (headers: string[]): boolean => {
    const comparisonHeaders = ['Company', 'P/E Ratio', 'P/S Ratio', 'Profit Margin', 'Market Cap'];
    return headers.some(header => comparisonHeaders.includes(header));
  };

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
          <AnalysisSection
            title={`${data.ticker} Analysis Results`}
            content={
              <div className="prose max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Global table handler that tracks table headers
                    table: ({node, children, ...props}) => {
                      // Store the headers to determine table type
                      return (
                        <div className="table-container">
                          <table {...props}>{children}</table>
                        </div>
                      );
                    },
                    // Header handler to identify table type
                    th: ({node, children, ...props}) => {
                      return <th {...props}>{children}</th>;
                    },
                    // Cell handler for proper alignment
                    td: ({node, children, ...props}) => {
                      const content = String(children);
                      
                      // Detect if we're in the value column (typically 3rd column in analysis tables)
                      // In competitor comparison tables, all cells should be centered
                      if (node.position?.start.column === 3 || 
                          content.includes('TSLA') || 
                          content.includes('GM') || 
                          content.includes('F') ||
                          content.includes('NIO') ||
                          content.includes('RIVN')) {
                        
                        // Handle comparison table company names
                        if (content.includes('TSLA') || 
                            content.includes('GM') || 
                            content.includes('F') ||
                            content.includes('NIO') ||
                            content.includes('RIVN')) {
                          return <td style={{ textAlign: 'center' }} {...props}>{children}</td>;
                        }
                        
                        // Value column in analysis tables
                        return <td style={{ textAlign: 'center' }} {...props}>{children}</td>;
                      }
                      
                      // Handle the commentary column (usually last column)
                      const cellPosition = node.position?.start.column || 0;
                      if (cellPosition === 4 || String(children).length > 40) {
                        return <td style={{ textAlign: 'left', whiteSpace: 'normal' }} {...props}>{children}</td>;
                      }
                      
                      // Default cell handling
                      return <td {...props}>{children}</td>;
                    },
                    // Special handling for comparison section
                    h4: ({node, children, ...props}) => {
                      const content = String(children);
                      if (content.includes('Competitor Comparison') || content.includes('Comparison')) {
                        return <h4 id="comparison-section" {...props}>{children}</h4>;
                      }
                      return <h4 {...props}>{children}</h4>;
                    }
                  }}
                >
                  {data.analysis}
                </ReactMarkdown>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
};

export default Analysis;
