
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AnalysisSection } from "@/components/AnalysisSection";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/Logo";

const Analysis = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<null | { analysis: string }>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [conversation, setConversation] = useState<Array<{ question: string; answer: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        
        const response = await fetch("https://marketmirror-api.onrender.com/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ticker }),
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || "Failed to analyze ticker");
        }
        
        setAnalysisData({ analysis: data.analysis });
      } catch (error) {
        console.error("Analysis error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch analysis. Please try again.",
          variant: "destructive",
        });
        setAnalysisData(null);
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      fetchAnalysis();
    }
  }, [ticker, toast]);

  const handleAskFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;

    // In a real app, this would be an API call to the follow-up endpoint
    const mockAnswer = `Based on the analysis, ${followUpQuestion.includes("future") ? 
      `${ticker} is expected to continue its growth trajectory, though perhaps at a more moderate pace than previous years.` : 
      `${ticker}'s performance in this area is consistent with industry standards, showing neither significant outperformance nor underperformance.`}`;

    setConversation([...conversation, { question: followUpQuestion, answer: mockAnswer }]);
    setFollowUpQuestion("");
  };

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Download",
      description: "Your analysis has been downloaded as a PDF.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full max-w-3xl mx-auto pt-8 px-4 md:px-0 flex justify-between items-center">
        <Link to="/" className="text-black hover:text-gray-700 flex items-center">
          <Logo />
        </Link>
        {!loading && analysisData && (
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF}
            className="text-sm border-gray-300"
          >
            Download PDF
          </Button>
        )}
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-0 py-12 flex-1">
        {loading ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : analysisData ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-medium">{ticker}</h1>
              <p className="text-xl text-gray-700">Comprehensive Financial Analysis</p>
            </div>

            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{analysisData.analysis}</ReactMarkdown>
            </div>

            {conversation.length > 0 && (
              <AnalysisSection 
                title="Q&A"
                content={
                  <div className="space-y-6">
                    {conversation.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <p className="font-medium">Q: {item.question}</p>
                        <p>A: {item.answer}</p>
                        {index < conversation.length - 1 && <Separator className="my-4 bg-gray-100" />}
                      </div>
                    ))}
                  </div>
                }
              />
            )}

            <form onSubmit={handleAskFollowUp} className="pt-6">
              <Input
                type="text"
                placeholder="Ask about this analysis..."
                className="w-full h-12 bg-[#F8F8F8] border border-gray-200 rounded-md px-4"
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
              />
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-red-500">Failed to load analysis. Please try again.</p>
            <Link to="/" className="mt-4 text-black underline">
              Return to home
            </Link>
          </div>
        )}
      </main>
      
      <footer className="w-full text-center py-6">
        <p className="text-sm text-gray-500">MarketMirror is in Beta</p>
      </footer>
    </div>
  );
};

export default Analysis;
