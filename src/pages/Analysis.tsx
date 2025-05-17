import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnalysisSection } from "@/components/AnalysisSection";
import Logo from "@/components/Logo";
import { ChartCandlestick, RefreshCw, Download } from "lucide-react";
import html2pdf from 'html2pdf.js';
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

// PDF wrapper component - internal use only
const PDFWrapper = ({ children, ticker }: { children: React.ReactNode, ticker: string }) => {
  return (
    <div className="pdf-document" style={{ padding: '20px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>{ticker.toUpperCase()} Financial Analysis</h1>
        <p style={{ margin: '0', color: '#666' }}>Generated on {new Date().toLocaleDateString()}</p>
      </div>
      <div className="pdf-content">
        {children}
      </div>
    </div>
  );
};

const Analysis = () => {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

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
      await fetchAnalysis(ticker, { bypassCache: true });
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

  const handleDownloadPDF = async () => {
    if (!analysisRef.current || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Create a dedicated element for the PDF that includes a header
      const pdfElement = document.createElement('div');
      pdfElement.innerHTML = `
        <style>
          @media print {
            .pdf-document { padding: 20px; font-family: Helvetica, Arial, sans-serif; }
            .pdf-header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; page-break-inside: avoid; }
            table, th, td { border: 1px solid #ddd; }
            th { background-color: #f5f5f5; padding: 8px; text-align: left; font-weight: bold; }
            td { padding: 8px; text-align: left; }
            td:nth-child(2) { text-align: right; }
            h2, h3, h4 { margin-top: 20px; page-break-after: avoid; }
            ul, ol { page-break-inside: avoid; }
          }
        </style>
        <div class="pdf-header">
          <h1 style="font-size: 24px; margin: 0 0 8px 0;">${ticker.toUpperCase()} Financial Analysis</h1>
          <p style="margin: 0; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      `;
      
      // Copy the analysis content
      const contentCopy = analysisRef.current.querySelector('.prose')?.cloneNode(true);
      if (contentCopy) {
        pdfElement.appendChild(contentCopy);
      }
      
      // Configure PDF options
      const options = {
        margin: 15,
        filename: `${ticker.toUpperCase()}_Analysis.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Generate PDF
      await html2pdf()
        .from(pdfElement)
        .set(options)
        .save();
      
      toast({
        title: "PDF Downloaded",
        description: `${ticker.toUpperCase()} analysis saved as PDF.`,
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
      console.error("PDF generation error:", err);
    } finally {
      setIsDownloading(false);
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
            <div ref={analysisRef}>
              <AnalysisSection
                title={`${data.ticker} Analysis Results`}
                content={
                  <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {data.analysis}
                    </ReactMarkdown>
                  </div>
                }
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end mt-6 mb-2 gap-2">
              {/* Download PDF Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
                      {isDownloading ? "Generating PDF..." : "Download PDF"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save analysis as PDF document</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Refresh Analysis Button */}
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
