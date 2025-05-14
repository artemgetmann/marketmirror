
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AnalysisSection } from "@/components/AnalysisSection";
import { useToast } from "@/hooks/use-toast";

const Analysis = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<null | any>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [conversation, setConversation] = useState<Array<{ question: string; answer: string }>>([]);
  const { toast } = useToast();

  // In a real app, this would be an API call
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data - in a real app, this would come from your API
        setAnalysisData({
          companyName: ticker === "AAPL" ? "Apple Inc." : `${ticker} Corporation`,
          summary: `${ticker} is currently trading at a price that suggests moderate value based on fundamentals. The company has shown consistent revenue growth over the past 5 years, with a compound annual growth rate (CAGR) of approximately 11.2%.`,
          financials: {
            revenueGrowth: "11.2% CAGR (5-year)",
            profitMargin: ticker === "AAPL" ? "25.3%" : "18.4%",
            peRatio: ticker === "AAPL" ? "28.7" : "22.3",
            debtToEquity: ticker === "AAPL" ? "1.52" : "0.78",
          },
          analysis: `Based on current market conditions and ${ticker}'s financial health, the stock appears to be trading at a ${ticker === "AAPL" ? "premium" : "reasonable"} valuation. The company's strong balance sheet and consistent cash flow generation provide a solid foundation for future growth. However, investors should be aware of potential risks including market volatility, competitive pressures, and regulatory challenges.`,
          recommendation: ticker === "AAPL" ? "Hold" : "Buy",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch analysis. Please try again.",
          variant: "destructive",
        });
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

    // In a real app, this would be an API call
    const mockAnswer = `Based on the analysis, ${followUpQuestion.includes("future") ? 
      `${ticker} is expected to continue its growth trajectory, though perhaps at a more moderate pace than previous years.` : 
      `${ticker}'s performance in this area is consistent with industry standards, showing neither significant outperformance nor underperformance.`}`;

    setConversation([...conversation, { question: followUpQuestion, answer: mockAnswer }]);
    setFollowUpQuestion("");
  };

  const handleDownloadPDF = () => {
    // In a real app, this would generate and download a PDF
    toast({
      title: "PDF Download",
      description: "Your analysis has been downloaded as a PDF.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full max-w-3xl mx-auto pt-8 px-4 md:px-0 flex justify-between items-center">
        <Link to="/" className="text-black hover:text-gray-700">
          <h1 className="text-2xl font-medium">MarketMirror</h1>
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
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500">Analyzing {ticker}...</p>
          </div>
        ) : analysisData ? (
          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="text-4xl font-medium">{analysisData.companyName} ({ticker})</h1>
              <p className="text-xl text-gray-700">{analysisData.summary}</p>
            </div>

            <AnalysisSection 
              title="Financial Overview"
              content={
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-gray-500">Revenue Growth</p>
                    <p className="text-xl">{analysisData.financials.revenueGrowth}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Profit Margin</p>
                    <p className="text-xl">{analysisData.financials.profitMargin}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">P/E Ratio</p>
                    <p className="text-xl">{analysisData.financials.peRatio}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Debt to Equity</p>
                    <p className="text-xl">{analysisData.financials.debtToEquity}</p>
                  </div>
                </div>
              }
            />

            <AnalysisSection 
              title="Market Analysis"
              content={<p className="text-lg leading-relaxed">{analysisData.analysis}</p>}
            />

            <AnalysisSection 
              title="Recommendation"
              content={
                <div className="py-4">
                  <span className={`text-xl font-medium px-4 py-2 rounded-full ${
                    analysisData.recommendation === "Buy" 
                      ? "bg-gray-100" 
                      : analysisData.recommendation === "Sell" 
                        ? "bg-gray-100" 
                        : "bg-gray-100"
                  }`}>
                    {analysisData.recommendation}
                  </span>
                </div>
              }
            />

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
