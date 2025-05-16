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
                    // Format table cells according to content type
                    td: ({node, children, ...props}) => {
                      // Check if this is the last column (Commentary/Assessment)
                      const isLastColumn = props.className?.includes('last-column') || 
                                          props.colSpan === 1 && props.style?.width === '50%';
                      
                      // Right-align cells that contain numbers (except in comparison tables)
                      const isNumeric = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?%?$/.test(
                        String(children).trim()
                      );
                      
                      if (isNumeric && !isLastColumn) {
                        return <td align="right" {...props}>{children}</td>;
                      }
                      
                      // For commentary cells, use normal text flow
                      if (isLastColumn || String(children).length > 40) {
                        return <td style={{ whiteSpace: 'normal', wordWrap: 'break-word' }} {...props}>{children}</td>;
                      }
                      
                      return <td {...props}>{children}</td>;
                    },
                    // Center align table headers
                    th: ({node, children, ...props}) => {
                      // Check if it looks like a comparison table header
                      const content = String(children).trim();
                      const isComparisonHeader = ['Company', 'P/E Ratio', 'P/S Ratio', 'Profit Margin', 'Market Cap'].includes(content) ||
                                               content.includes('Ratio') || content.includes('Margin') || content.includes('Cap');
                      
                      if (isComparisonHeader) {
                        return <th align="center" {...props}>{children}</th>;
                      }
                      
                      return <th align="center" {...props}>{children}</th>;
                    },
                    // Customize table rendering
                    table: ({node, ...props}) => (
                      <div className="table-container">
                        <table {...props} />
                      </div>
                    ),
                    // Add special handling for comparison tables that appear after headings
                    h4: ({node, children, ...props}) => {
                      const content = String(children).trim();
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
