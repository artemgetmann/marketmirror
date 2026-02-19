import React from 'react';

interface PricingTeaserProps {
  onJoinWaitlist: () => void;
}

const PricingTeaser: React.FC<PricingTeaserProps> = ({ onJoinWaitlist }) => {
  return (
    <div className="mt-8 p-6 border border-gray-100 rounded-2xl bg-gray-50">
      <h3 className="text-xl font-medium text-black">MarketMirror Premium Coming Soon</h3>
      
      <p className="mt-3 text-base text-gray-600">
        Get unlimited analyses, priority support, and advanced features.
      </p>
      
      <div className="mt-6">
        <button
          onClick={onJoinWaitlist}
          className="px-6 py-3 border-0 rounded-xl text-base font-medium text-white bg-black hover:bg-gray-900 transition-colors"
        >
          Join the waitlist
        </button>
      </div>
    </div>
  );
};

export default PricingTeaser;
