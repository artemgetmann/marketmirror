
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { HelpCircle } from "lucide-react";

const Index = () => {
  const [tickerSymbol, setTickerSymbol] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tickerSymbol.trim()) {
      navigate(`/analysis/${tickerSymbol.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 bg-white">
      <div className="absolute top-6 left-6">
        <Logo />
      </div>
      
      <div className="absolute top-11 right-6">
        <Link to="/about" className="text-gray-600 hover:text-gray-900" aria-label="About MarketMirror">
          <HelpCircle size={30} />
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto text-center space-y-6">
        <h1 className="text-5xl font-medium text-black">MarketMirror</h1>
        <p className="text-xl text-gray-700">Wall Street analysis, Hacked by AI</p>
        
        <form onSubmit={handleSubmit} className="mt-12 space-y-6 w-full">
          <Input
            type="text"
            placeholder="Enter stock ticker (e.g., AAPL)"
            className="w-full h-14 text-sm bg-[#F8F8F8] border border-gray-200 rounded-md px-4"
            value={tickerSymbol}
            onChange={(e) => setTickerSymbol(e.target.value)}
          />
          
          <Button 
            type="submit"
            className="w-40 h-12 bg-black hover:bg-gray-800 text-white rounded-full text-lg"
            disabled={!tickerSymbol.trim()}
          >
            Begin
          </Button>
        </form>
      </div>
      
      <div className="text-center text-sm text-gray-500 mt-12">
        MarketMirror is in Beta
      </div>
    </div>
  );
};

export default Index;
