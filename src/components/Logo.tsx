
import React from "react";

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center">
      <img 
        src="/lovable-uploads/37c8b23a-bdfe-4834-ba6e-667514d2a4e1.png" 
        alt="MarketMirror Logo" 
        className="w-12 h-12 mr-3" 
      />
      <span className="text-3xl font-medium">MarketMirror</span>
    </div>
  );
};
