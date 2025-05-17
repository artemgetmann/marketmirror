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
                    // Apply minimal styling for tables
                    table: () => (
                      <div className="table-container">
                        <table className="w-full border-collapse my-8" />
                      </div>
                    ),
                    thead: (props) => <thead className="bg-gray-50 border-b-2 border-gray-200" {...props} />,
                    th: (props) => <th className="text-center p-3 font-semibold" {...props} />,
                    td: ({node, children, ...props}) => {
                      const content = String(children);
                      // Basic alignment logic - numbers and short values centered, text left-aligned
                      const isNumeric = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?%?$/.test(content.trim()) ||
                                       content.includes('%') ||
                                       content.includes('/') ||
                                       content.includes('B') ||
                                       content === 'N/A' ||
                                       content === '-';
                      
                      const isShortText = content.length < 20;
                      const style = {
                        textAlign: (isNumeric || isShortText ? 'center' : 'left') as 'center' | 'left',
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e5e5e5'
                      };
                      
                      return <td style={style} {...props}>{children}</td>;
                    },
                    tr: (props) => {
                      const rowProps = props as any;
                      const isEven = rowProps.index ? rowProps.index % 2 === 0 : false;
                      return <tr className={isEven ? 'bg-gray-50' : 'bg-white'} {...props} />;
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
