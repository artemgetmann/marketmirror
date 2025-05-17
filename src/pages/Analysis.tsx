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
      // Clone the analysis content for styling
      const element = analysisRef.current.cloneNode(true) as HTMLElement;
      
      // Add PDF-specific styling
      const style = document.createElement('style');
      style.innerHTML = `
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          padding: 20px;
          color: #333;
          line-height: 1.5;
        }
        .page-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        h1, h2, h3, h4 {
          margin-top: 20px;
          margin-bottom: 10px;
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        p {
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 11px;
          page-break-inside: avoid;
        }
        table, th, td {
          border: 1px solid #ddd;
        }
        table th {
          background-color: #f3f3f3;
          font-weight: bold;
          text-align: center;
          padding: 8px;
        }
        table td {
          padding: 8px;
          text-align: center;
        }
        table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        /* Keep sections together */
        section {
          page-break-inside: avoid;
        }
        ul, ol {
          page-break-inside: avoid;
        }
        /* Force page breaks before major sections */
        h2 {
          page-break-before: always;
        }
        /* But don't break after the first heading */
        h2:first-of-type {
          page-break-before: avoid;
        }
        li {
          margin-bottom: 5px;
        }
        a {
          color: #0066cc;
          text-decoration: none;
        }
      `;
      element.appendChild(style);
      
      // Create a header for PDF
      const header = document.createElement('div');
      header.className = 'page-header';
      header.innerHTML = `
        <h1 style="margin:0;padding:0;font-size:24px;">${ticker.toUpperCase()} Financial Analysis</h1>
        <p style="margin:5px 0;color:#666;font-size:14px;">Generated on ${new Date().toLocaleDateString()}</p>
      `;
      element.prepend(header);
      
      // Process tables for better formatting
      const tables = element.querySelectorAll('table');
      
      // Group consecutive tables to prevent breaks between them
      let tableGroups = [];
      let currentGroup = [];
      
      // First collect tables into groups based on proximity
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        currentGroup.push(table);
        
        // Check if this is the last table or if the next element is not a table or has significant content between
        const nextSibling = table.nextElementSibling;
        if (i === tables.length - 1 || 
            !nextSibling || 
            (nextSibling.tagName !== 'TABLE' && 
             nextSibling.textContent && 
             nextSibling.textContent.trim().length > 20)) {
          
          // Save this group and start a new one
          if (currentGroup.length > 0) {
            tableGroups.push([...currentGroup]);
            currentGroup = [];
          }
        }
      }
      
      // Now wrap each group in a single container
      tableGroups.forEach(group => {
        if (group.length === 1) {
          // Single table - simple wrap
          const table = group[0];
          // Add class to table for styling
          table.classList.add('pdf-table');
          const wrapper = document.createElement('div');
          wrapper.style.pageBreakInside = 'avoid';
          wrapper.classList.add('pdf-table-container');
          table.parentNode?.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        } else if (group.length > 1) {
          // Multiple consecutive tables - wrap together
          const firstTable = group[0];
          const wrapper = document.createElement('div');
          wrapper.style.pageBreakInside = 'avoid';
          wrapper.classList.add('pdf-table-group');
          
          // Insert wrapper before the first table
          firstTable.parentNode?.insertBefore(wrapper, firstTable);
          
          // Move all tables in this group into the wrapper
          group.forEach(table => {
            // Add class to table for styling
            table.classList.add('pdf-table');
            wrapper.appendChild(table);
          });
        }
      });
      
      // Add section wrappers to prevent breaks inside sections
      const headings = element.querySelectorAll('h2, h3');
      headings.forEach(heading => {
        // Create a section wrapper
        const section = document.createElement('section');
        
        // Get all elements until the next heading
        let current = heading.nextElementSibling;
        const elementsToWrap = [heading];
        
        while (current && !['H2', 'H3'].includes(current.tagName)) {
          elementsToWrap.push(current);
          const next = current.nextElementSibling;
          current = next;
        }
        
        // If we have elements to wrap
        if (elementsToWrap.length > 1) {
          heading.parentNode?.insertBefore(section, heading);
          elementsToWrap.forEach(el => section.appendChild(el));
        }
      });
      
      // Configure PDF options
      const options = {
        margin: [15, 15, 15, 15], // top, right, bottom, left
        filename: `${ticker.toUpperCase()}_Analysis.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      // Generate PDF
      await html2pdf().from(element).set(options).save();
      
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
