import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { generateOrRetrieveSessionId, saveUsageInfo, getUsageInfo, saveAccessibleAnalyses, getAccessibleAnalyses, addToAccessibleAnalyses } from "@/lib/session";
import AccessibleAnalyses from "@/components/AccessibleAnalyses";
import AnalysisHistory from "@/components/AnalysisHistory";
import { getAuthHeaders, isAdminAuthenticated } from "@/lib/adminAuth";
import EmailCaptureModal from "@/components/EmailCaptureModal";
import AdminLogin from "@/components/AdminLogin";
import UsageCounter from "@/components/UsageCounter";
import PricingTeaser from "@/components/PricingTeaser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { AnalysisSection } from "@/components/AnalysisSection";
import Logo from "@/components/Logo";
import { ChartCandlestick, RefreshCw, Download, MessageCircle, Key } from "lucide-react";
import html2pdf from "html2pdf.js";
import { ChatInterface } from "@/components/ChatInterface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UsageInfo {
  usageCount: number;
  usageLimit: number;
  remainingUses: number;
}

interface AnalysisData {
  success: boolean;
  ticker: string;
  analysis: string;
  fromCache?: boolean;
  isCachedAnalysis?: boolean;
  error?: string;
  sessionId?: string;
  usageInfo?: UsageInfo;
  analysisHistory?: {
    accessibleAnalyses: string[];
    count: number;
  };
  accessibleAnalyses?: string[];
  canAccessCached?: boolean;
  message?: string;
  resetTime?: string;
  resetInSeconds?: number;
  usageLimit?: number;
}

interface FetchAnalysisOptions {
  bypassCache?: boolean;
}

const fetchAnalysis = async (
  ticker: string,
  options?: FetchAnalysisOptions,
): Promise<AnalysisData> => {
  // Get session ID for tracking usage
  const sessionId = generateOrRetrieveSessionId();
  
  // Get admin auth headers if available
  const authHeaders = getAuthHeaders();
  
  try {
    const response = await fetch(
      "https://marketmirror-api.onrender.com/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders, // Include admin token if available
        },
        body: JSON.stringify({
          ticker,
          bypassCache: options?.bypassCache,
          sessionId, // Include sessionId in requests
        }),
      },
    );
    
    // Handle rate limit response specifically (status 429)
    if (response.status === 429) {
      const errorData = await response.json();
      
      // If we have accessible analyses with our rate limit error
      if (errorData.accessibleAnalyses && Array.isArray(errorData.accessibleAnalyses)) {
        // Store accessible analyses for later use
        saveAccessibleAnalyses(errorData.accessibleAnalyses);
        
        // Add our own flag to identify rate limit errors with accessible analyses
        throw {
          ...errorData,
          isRateLimited: true,
          status: 429
        };
      }
      
      // Standard rate limit error without accessible analyses
      throw new Error(errorData.error || "You've reached your daily limit");
    }
    
    // For other error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch analysis");
    }

    // Process successful response
    const data = await response.json();

    // Ensure sessionId is included in the response data
    if (!data.sessionId) {
      console.warn("No session ID returned from API");
    }
    
    // If usage info is provided, store it
    if (data.usageInfo) {
      saveUsageInfo(data.usageInfo);
    }
    
    // Store the ticker in accessible analyses (both from history and the current ticker)
    if (data.analysisHistory?.accessibleAnalyses) {
      saveAccessibleAnalyses(data.analysisHistory.accessibleAnalyses);
    } else {
      // Always add the current ticker to accessible analyses on successful analysis
      addToAccessibleAnalyses(ticker);
    }

    return data;
  } catch (error) {
    // If this is our custom rate limit error with accessible analyses, rethrow it
    if (error && typeof error === 'object' && 'isRateLimited' in error) {
      throw error;
    }
    
    // Otherwise, rethrow the original error
    throw error;
  }
};

const Analysis = () => {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfLimited, setIsPdfLimited] = useState(true); // Default to true for free accounts
  const [showPdfLimitModal, setShowPdfLimitModal] = useState(false);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{resetTime?: Date; resetInSeconds?: number} | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(getUsageInfo());
  const [accessibleAnalyses, setAccessibleAnalyses] = useState<string[]>(getAccessibleAnalyses());
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminAuthenticated());
  const analysisRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analysis", ticker],
    queryFn: async () => {
      try {
        // Reset rate limit state on each new query
        setIsRateLimited(false);
        setRateLimitMessage("");
        
        // Attempt to fetch the analysis
        const result = await fetchAnalysis(ticker);
        
        // Update usage info when we get new data
        if (result.usageInfo) {
          setUsageInfo(result.usageInfo);
          
          // Check if user has reached limit
          if (result.usageInfo.remainingUses <= 0) {
            setRateLimitInfo({
              resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
              resetInSeconds: 24 * 60 * 60
            });
          }
        }
        
        // Update accessible analyses if provided in the response
        if (result.analysisHistory?.accessibleAnalyses) {
          setAccessibleAnalyses(result.analysisHistory.accessibleAnalyses);
        }
        
        return result;
      } catch (err: any) {
        // Check if this is our custom rate limit error with accessible analyses
        if (err && typeof err === 'object' && 'isRateLimited' in err) {
          // Set rate limit info for UI display
          setIsRateLimited(true);
          setRateLimitMessage(err.message || 'You have reached your daily limit');
          
          if (err.resetTime) {
            setRateLimitInfo({
              resetTime: new Date(err.resetTime),
              resetInSeconds: err.resetInSeconds
            });
          }
          
          // Update accessible analyses from the error response
          if (err.accessibleAnalyses && Array.isArray(err.accessibleAnalyses)) {
            setAccessibleAnalyses(err.accessibleAnalyses);
          }
          
          // Always show email modal for rate limits
          setShowEmailModal(true);
          
          // If this ticker is in accessible analyses, try to get it from cache
          if (err.accessibleAnalyses?.includes(ticker)) {
            try {
              const cachedResult = await fetchAnalysis(ticker);
              return cachedResult;
            } catch (innerErr) {
              // Just throw the error if we can't get cached analysis
              throw innerErr;
            }
          }
        } else if (err.status === 429 || (typeof err.message === 'string' && err.message.includes("limit"))) {
          // Generic rate limit error (for backward compatibility)
          setRateLimitInfo({
            resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            resetInSeconds: 24 * 60 * 60
          });
          setShowEmailModal(true);
        } else {
          // For other errors, show error toast and the email modal
          toast({
            title: "Error Fetching Analysis",
            description: err.message || "An error occurred",
            variant: "destructive",
          });
          setRateLimitInfo(null);
          setShowEmailModal(true);
        }
        
        throw err;
      }
    },
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
    
    // Check if user is restricted from PDF downloads (free account)
    if (isPdfLimited) {
      // Show the PDF limit modal instead of generating the PDF
      setShowPdfLimitModal(true);
      return;
    }

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

  // Check admin status on mount and when localStorage might change
  useEffect(() => {
    const checkAdminStatus = () => {
      setIsAdmin(isAdminAuthenticated());
    };
    
    // Check on mount
    checkAdminStatus();
    
    // Listen for storage events (in case admin login happens in another tab)
    window.addEventListener('storage', checkAdminStatus);
    
    return () => {
      window.removeEventListener('storage', checkAdminStatus);
    };
  }, []);

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
        <div className="mb-6">
          <h2 className="text-3xl font-medium">{ticker.toUpperCase()} Analysis</h2>
        </div>
        
        {/* Show analysis history for easy navigation */}
        {accessibleAnalyses.length > 0 && (
          <div className="mb-6">
            <AnalysisHistory 
              tickers={accessibleAnalyses} 
              currentTicker={ticker} 
            />
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ChartCandlestick className="animate-spin h-16 w-16 text-black mb-4" />
            <p className="text-xl text-gray-600">Analyzing {ticker}...</p>
          </div>
        )}

        {isError && !isRateLimited && (
          <div className="rounded-2xl bg-gray-50 shadow-xl p-8 mt-6 max-w-xl mx-auto space-y-8">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-900">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
                Error Retrieving Analysis
              </h3>
            </div>

            <div className="space-y-6 text-left">
              <p className="text-base text-gray-700 leading-relaxed">
                We encountered an error while retrieving your analysis. Please try again later.
              </p>
              
              <p className="text-base text-gray-700">
                If this problem persists, please contact support.
                {/* Hidden developer access - double click on the last period will open admin modal */}
                <span 
                  onDoubleClick={() => setShowAdminModal(true)} 
                  className="cursor-default select-none"
                  title="Developer access (double-click)"
                >.</span>
              </p>
            </div>
            
            <div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="default"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="relative">
            <div ref={analysisRef}>
              <AnalysisSection
                title={`${data.ticker} Analysis Results`}
                content={
                  <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                    {/* Extract and parse the analysis text */}
                    {(() => {
                      // Define the exact disclaimer text to look for
                      const disclaimerText = "MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉";
                      
                      // Check if analysis contains the disclaimer
                      const hasDisclaimer = data.analysis.includes(disclaimerText) || 
                                            data.analysis.includes(disclaimerText.replace(" 😉", ""));
                      
                      // If it has the disclaimer, remove it from the analysis for rendering separately
                      let cleanAnalysis = data.analysis;
                      if (hasDisclaimer) {
                        cleanAnalysis = data.analysis.replace(disclaimerText, "").replace(disclaimerText.replace(" 😉", ""), "");
                      }
                      
                      return (
                        <div className="prose">
                          {/* Render main analysis content */}
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {cleanAnalysis}
                          </ReactMarkdown>
                          
                          {/* Render disclaimer separately with proper styling */}
                          {hasDisclaimer && (
                            <p style={{
                              fontSize: '0.75rem',
                              color: '#6B7280',
                              marginTop: '1rem',
                              opacity: 0.8,
                              lineHeight: 1.4,
                              fontStyle: 'italic'
                            }}>
                              <em>MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point.</em> <span className="emoji">😉</span>
                            </p>
                          )}
                        </div>
                      );
                    })()}
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
            
            {/* Admin indicator (hidden from main UI) */}
            {isAdmin && (
              <div className="text-xs text-right mt-1">
                <div className="text-green-600 flex items-center justify-end">
                  <Key size={12} className="mr-1" />
                  <span>Developer Mode</span>
                </div>
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
      
      {/* Rate limit modal for daily usage */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        resetTime={rateLimitInfo?.resetTime}
        resetInSeconds={rateLimitInfo?.resetInSeconds}
      />
      
      {/* PDF restriction modal for free accounts */}
      <EmailCaptureModal
        isOpen={showPdfLimitModal}
        onClose={() => setShowPdfLimitModal(false)}
        resetTime={new Date(Date.now() + 24 * 60 * 60 * 1000)}
        resetInSeconds={24 * 60 * 60}
        customTitle="PDF Downloads are Premium"
        customMessage={`PDF downloads are an exclusive premium feature. Premium users will get unlimited PDF exports.`}
      />
      
      {/* Admin Login Modal */}
      <AdminLogin
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </div>
  );
};

export default Analysis;
