import React from 'react';

interface UsageInfo {
  usageCount: number;
  usageLimit: number;
  remainingUses: number;
}

interface UsageCounterProps {
  usageInfo: UsageInfo | null;
}

const UsageCounter: React.FC<UsageCounterProps> = ({ usageInfo }) => {
  if (!usageInfo) return null;
  
  const { remainingUses, usageLimit } = usageInfo;
  
  return (
    <div className="mt-4 text-sm text-gray-500 flex items-center">
      <span>
        {remainingUses} of {usageLimit} analyses remaining
      </span>
      
      {remainingUses < 2 && (
        <span className="text-amber-600 ml-2 font-medium">
          • Running low
        </span>
      )}
    </div>
  );
};

export default UsageCounter;
