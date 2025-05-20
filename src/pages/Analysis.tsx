import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnalysisSection } from "@/components/AnalysisSection";
import Logo from "@/components/Logo";
import { ChartCandlestick, RefreshCw, Download, MessageCircle } from "lucide-react";
import html2pdf from "html2pdf.js";
import { ChatInterface } from "@/components/ChatInterface";
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
  sessionId?: string;
}

interface FetchAnalysisOptions {
  bypassCache?: boolean;
}

const fetchAnalysis = async (
  ticker: string,
  options?: FetchAnalysisOptions,
): Promise<AnalysisData> => {
  const response = await fetch(
    "https://marketmirror-api.onrender.com/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker,
        bypassCache: options?.bypassCache,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch analysis");
  }

  const data = await response.json();

  // Ensure sessionId is included in the response data
  if (!data.sessionId) {
    console.warn("No session ID returned from API");
  }

  return data;
};

const Analysis = () => {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

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
      const style = document.createElement("style");
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
          table-layout: fixed;
          break-inside: avoid;
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
        table tr {
          page-break-inside: avoid;
          break-inside: avoid;
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
      const header = document.createElement("div");
      header.className = "page-header";
      header.innerHTML = `
        <h1 style="margin:0;padding:0;font-size:24px;">${ticker.toUpperCase()} Financial Analysis</h1>
        <p style="margin:5px 0;color:#666;font-size:14px;">Generated on ${new Date().toLocaleDateString()}</p>
      `;
      element.prepend(header);

      // Process tables for better formatting
      const tables = element.querySelectorAll("table");

      // First identify adjacent tables and merge their containers
      if (tables.length > 1) {
        let currentTable = tables[0];
        let tableGroups = [];
        let currentGroup = [currentTable];

        // Group adjacent tables
        for (let i = 1; i < tables.length; i++) {
          const table = tables[i];
          const prevTable = tables[i - 1];

          // Check if tables are adjacent (no significant content between them)
          let isAdjacent = true;
          let node = prevTable.nextSibling;

          while (node && node !== table) {
            // If there's a significant element between tables, they're not adjacent
            if (
              node.nodeType === 1 &&
              !["BR", "HR"].includes((node as Element).tagName) &&
              (node as Element).textContent &&
              (node as Element).textContent.trim().length > 0
            ) {
              isAdjacent = false;
              break;
            }
            node = node.nextSibling;
          }

          if (isAdjacent) {
            // Add to current group if adjacent
            currentGroup.push(table);
          } else {
            // Start a new group
            tableGroups.push([...currentGroup]);
            currentGroup = [table];
          }
        }

        // Add the last group
        if (currentGroup.length > 0) {
          tableGroups.push(currentGroup);
        }

        // Process each group of tables
        tableGroups.forEach((group) => {
          if (group.length > 1) {
            // Create one strong container for the entire group
            const container = document.createElement("div");
            container.style.pageBreakInside = "avoid";
            container.style.breakInside = "avoid";
            container.style.display = "block";
            container.style.margin = "20px 0";
            container.dataset.tableGroup = "true";

            // Insert container before first table
            const firstTable = group[0];
            firstTable.parentNode?.insertBefore(container, firstTable);

            // Move all tables in the group to this container
            group.forEach((table) => {
              // Style each table
              table.classList.add("pdf-table");
              table.style.pageBreakInside = "avoid";
              table.style.breakInside = "avoid";
              table.style.marginBottom = "0";
              table.style.marginTop = "0";

              // Force rows to stay together
              const rows = table.querySelectorAll("tr");
              rows.forEach((row) => {
                row.style.pageBreakInside = "avoid";
                row.style.breakInside = "avoid";
              });

              // Move to container
              container.appendChild(table);
            });
          } else if (group.length === 1) {
            // Single table, apply standard wrapper
            const table = group[0];
            table.classList.add("pdf-table");

            const wrapper = document.createElement("div");
            wrapper.style.pageBreakInside = "avoid";
            wrapper.style.breakInside = "avoid";
            wrapper.style.margin = "20px 0";

            table.parentNode?.insertBefore(wrapper, table);
            wrapper.appendChild(table);

            // Force rows to stay together
            const rows = table.querySelectorAll("tr");
            rows.forEach((row) => {
              row.style.pageBreakInside = "avoid";
              row.style.breakInside = "avoid";
            });
          }
        });
      } else {
        // If only one table, use the original approach
        tables.forEach((table) => {
          table.classList.add("pdf-table");

          const wrapper = document.createElement("div");
          wrapper.style.pageBreakInside = "avoid";
          wrapper.style.breakInside = "avoid";
          wrapper.style.margin = "20px 0";

          table.parentNode?.insertBefore(wrapper, table);
          wrapper.appendChild(table);

          const rows = table.querySelectorAll("tr");
          rows.forEach((row) => {
            row.style.pageBreakInside = "avoid";
            row.style.breakInside = "avoid";
          });
        });
      }

      // Add section wrappers to prevent breaks inside sections
      const headings = element.querySelectorAll("h2, h3");
      headings.forEach((heading) => {
        // Create a section wrapper
        const section = document.createElement("section");

        // Get all elements until the next heading
        let current = heading.nextElementSibling;
        const elementsToWrap = [heading];

        while (current && !["H2", "H3"].includes(current.tagName)) {
          elementsToWrap.push(current);
          const next = current.nextElementSibling;
          current = next;
        }

        // If we have elements to wrap
        if (elementsToWrap.length > 1) {
          heading.parentNode?.insertBefore(section, heading);
          elementsToWrap.forEach((el) => section.appendChild(el));
        }
      });

      // Configure PDF options
      const options = {
        margin: [15, 15, 15, 15], // top, right, bottom, left
        filename: `${ticker.toUpperCase()}_Analysis.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        enableLinks: true,
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

  // Scroll to chat section
  const scrollToChat = () => {
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Show floating chat button when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      if (chatSectionRef.current) {
        const chatPosition = chatSectionRef.current.getBoundingClientRect().top;
        setShowFloatingChat(chatPosition < 0 || chatPosition > window.innerHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          <h2 className="text-3xl font-medium">{ticker} Analysis</h2>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ChartCandlestick className="animate-spin h-16 w-16 text-black mb-4" />
            <p className="text-xl text-gray-600">Analyzing {ticker}...</p>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-xl font-medium text-red-800 mb-2">
              Analysis Failed
            </h3>
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
                      <Download
                        className={`h-4 w-4 ${isDownloading ? "animate-pulse" : ""}`}
                      />
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
                      className={`gap-2 ${data.fromCache ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : ""}`}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                      />
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

            {/* Chat section with ref */}
            <div ref={chatSectionRef} className="mt-3">
              {/* Chat interface */}
              {data.sessionId && (
                <ChatInterface sessionId={data.sessionId} ticker={ticker} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating chat button */}
      {showFloatingChat && data?.sessionId && !isLoading && !isError && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={scrollToChat}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Ask follow-up questions</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default Analysis;
