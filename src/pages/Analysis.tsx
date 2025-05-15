
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { AnalysisSection } from "@/components/AnalysisSection";
import Logo from "@/components/Logo";
import { ChartCandlestick } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

// Helper function to clean the analysis text by removing debug messages
const cleanAnalysisText = (text: string): string => {
  if (!text) return "";
  
  // Filter out debug lines
  return text
    .split('\n')
    .filter(line => 
      !line.match(/Analyzing|Fetching data|Data retrieved|Creating|Making|Extracting|Successfully extracted|Combining parts|==========/)
    )
    .join('\n');
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

  // Process and clean analysis text if data exists
  const cleanedAnalysis = data ? cleanAnalysisText(data.analysis) : "";

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
              <div className="prose max-w-none analysis-content">
                <ReactMarkdown 
                  components={{
                    // Custom table rendering
                    table: ({ node, ...props }) => (
                      <Table {...props} className="my-4 border-collapse w-full" />
                    ),
                    thead: ({ node, ...props }) => (
                      <TableHeader {...props} className="bg-gray-50" />
                    ),
                    tr: ({ node, ...props }) => (
                      <TableRow {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <TableHead {...props} className="py-3 px-4 text-left font-semibold text-gray-900" />
                    ),
                    td: ({ node, ...props }) => (
                      <TableCell {...props} className="py-2 px-4 border-t border-gray-200" />
                    ),
                    tbody: ({ node, ...props }) => (
                      <TableBody {...props} />
                    ),
                  }}
                >
                  {cleanedAnalysis}
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
