import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { generateOrRetrieveSessionId, getAccessibleAnalyses } from '@/lib/session';
import AccessibleAnalyses from './AccessibleAnalyses';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetTime?: Date;
  resetInSeconds?: number;
}

const EmailCaptureModal: React.FC<EmailCaptureModalProps> = ({ 
  isOpen, 
  onClose, 
  resetTime, 
  resetInSeconds 
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [accessibleAnalyses, setAccessibleAnalyses] = useState<string[]>([]);
  
  // Load accessible analyses when modal opens
  useEffect(() => {
    if (isOpen) {
      setAccessibleAnalyses(getAccessibleAnalyses());
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const sessionId = generateOrRetrieveSessionId();
      
      // Currently this API endpoint is not implemented on the backend
      // This will need to be updated when the backend is ready
      const response = await fetch('https://marketmirror-api.onrender.com/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          sessionId, 
          source: 'usage-limit'
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
  
  // Format reset time in a user-friendly way
  const getResetTimeText = (): string => {
    if (resetTime) {
      // Simple formatter for demonstration
      const hours = resetTime.getHours();
      const minutes = resetTime.getMinutes();
      return `at ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
    }
    
    if (resetInSeconds) {
      const hours = Math.floor(resetInSeconds / 3600);
      const minutes = Math.floor((resetInSeconds % 3600) / 60);
      
      if (hours > 0) {
        return `in ${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }
    
    return 'tomorrow';
  };
  
  const resetTimeFormatted = getResetTimeText();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold tracking-tight text-gray-900">
            {isSubmitted ? 'Welcome to the Rebellion' : 'You\'ve Reached Today\'s Limit'}
          </h3>
          <button 
            onClick={() => {
              onClose();
              window.location.href = '/';
            }}
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
                That's what happens when clarity spreads faster<br/>
                than Wall Street can stop it.
              </p>
              
              {/* Show accessible analyses if available */}
              {accessibleAnalyses.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium mb-2">You can still view your previous analyses:</p>
                  {accessibleAnalyses.map(ticker => (
                    <a 
                      key={ticker} 
                      href={`/analysis/${ticker}`} 
                      className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-full px-4 py-1 font-bold text-sm"
                      onClick={() => onClose()}
                    >
                      {ticker.toUpperCase()}
                    </a>
                  ))[0]}
                  <p className="text-xs text-gray-500 mt-2">
                    Limit resets in about 23 hours
                  </p>
                </div>
              )}
              
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
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-black text-white py-2.5 rounded-full font-medium hover:bg-gray-900 transition"
              >
                {isSubmitting ? 'Processing...' : 'Join the Rebellion'}
              </button>
              
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
                You're in.
              </h4>
            </div>
            
            <p className="text-gray-700 text-center leading-relaxed">
              We'll let you know when early access drops.<br/>Thanks for backing the future of investing — built on logic, not legacy.
            </p>
            
            <div className="mt-6">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-full border border-gray-200 text-gray-800 font-medium hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
            
            <p className="mt-4 text-xs text-gray-500 text-center">Your free quota resets at midnight.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailCaptureModal;
