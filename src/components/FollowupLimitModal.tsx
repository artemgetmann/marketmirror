import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FollowupLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  ticker: string;
  followupLimit: number;
}

const FollowupLimitModal: React.FC<FollowupLimitModalProps> = ({
  isOpen,
  onClose,
  message,
  ticker,
  followupLimit
}) => {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');
  
  const navigate = useNavigate();
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'followup-limit'
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit email');
      }
      
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartNewAnalysis = () => {
    onClose();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold tracking-tight text-gray-900">
            {isSubmitted ? 'You\'re on the Waitlist' : 'Follow-up Limit Reached'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        
        {!isSubmitted ? (
          <>
            <div className="space-y-5 text-gray-700">
              <p>
                {message || `You've reached the limit of ${followupLimit} follow-up questions for this analysis.`}
              </p>
              
              <div className="space-y-1">
                <p>They said: <span className="text-gray-500">"People need advisors."</span></p>
                <p><span className="font-bold">We asked:</span> "Why?"</p>
              </div>
              
              <p className="pb-2">
                MarketMirror is the rebellion.<br/>
                Not built for institutions. Built for people who think for themselves.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-500 rounded-md text-base"
              />
              
              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-black text-white py-2.5 rounded-full font-medium hover:bg-gray-900 transition"
              >
                {isSubmitting ? 'Processing...' : 'Join the Waitlist'}
              </Button>
              
              <Button
                onClick={handleStartNewAnalysis}
                variant="outline"
                className="w-full py-2.5 rounded-md font-medium transition"
              >
                Start New Analysis
              </Button>
              
              <p className="text-xs text-gray-500 text-center">Help us replace legacy with logic.</p>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 mx-auto flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-900">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 className="text-xl font-medium text-gray-900">
                You&apos;re on the waitlist!
              </h4>
            </div>
            
            <p className="text-gray-700 text-center leading-relaxed">
              We'll let you know when premium features drop.<br/>Thanks for backing the future of investing — built on logic, not legacy.
            </p>
            
            <div className="mt-6">
              <Button
                onClick={handleStartNewAnalysis}
                className="w-full py-3 rounded-full bg-black text-white font-medium hover:bg-gray-900 transition"
              >
                Start New Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowupLimitModal;
