
import React from "react";

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <img 
        src="/lovable-uploads/3405e09c-d358-44b5-a1dc-8ce20c9c6819.png" 
        alt="MarketMirror Logo" 
        className="w-10 h-10 mr-3" 
      />
      <span className="text-2xl font-medium">MarketMirror</span>
    </div>
  );
};
