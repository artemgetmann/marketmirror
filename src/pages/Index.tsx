
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

const Index = () => {
  const [tickerSymbol, setTickerSymbol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tickerSymbol.trim()) {
      setIsSubmitting(true);
      // Navigate to the analysis page with the ticker symbol
      navigate(`/analysis/${tickerSymbol.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-xl text-center space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="text-xl text-gray-700">A space for financial clarity</p>
        
        <form onSubmit={handleSubmit} className="mt-12 space-y-6">
          <Input
            type="text"
            placeholder="Enter ticker symbol (e.g., AAPL)"
            className="w-full h-14 text-lg bg-[#F8F8F8] border border-gray-200 rounded-md px-4"
            value={tickerSymbol}
            onChange={(e) => setTickerSymbol(e.target.value)}
            disabled={isSubmitting}
          />
          
          <Button 
            type="submit"
            className="w-40 h-12 bg-black hover:bg-gray-800 text-white rounded-full text-lg"
            disabled={!tickerSymbol.trim() || isSubmitting}
          >
            {isSubmitting ? "Loading..." : "Begin"}
          </Button>
        </form>
      </div>
      
      <div className="absolute bottom-6 text-sm text-gray-500">
        MarketMirror is in Beta
      </div>
    </div>
  );
};

export default Index;
