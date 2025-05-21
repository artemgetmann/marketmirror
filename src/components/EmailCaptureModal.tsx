import React, { useState } from 'react';
import { X } from 'lucide-react';
import { generateOrRetrieveSessionId } from '@/lib/session';

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
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <h3 className="text-2xl font-medium text-black">
            {isSubmitted ? 'Thanks for joining!' : 'Daily Limit Reached'}
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
            <div className="space-y-4">
              <p className="text-gray-600 text-lg">
                You've reached your daily limit of free analyses. Your limit will reset {resetTimeFormatted}.
              </p>
              <p className="text-gray-800 text-lg">
                Want unlimited access? Join our waitlist for early access when we launch premium features.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-base"
                />
              </div>
              
              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
              
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border-0 rounded-xl text-base font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Join the Waitlist'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl bg-gray-50 p-6 border border-gray-100">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-lg font-medium text-gray-800">
                    Thanks for signing up!
                  </p>
                  <p className="mt-2 text-base text-gray-600">
                    We'll notify you as soon as premium access becomes available.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-gray-600 text-base">
              Your daily limit will reset {resetTimeFormatted}. Come back then for more free analyses!
            </p>
            
            <button
              onClick={onClose}
              className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-base font-medium text-gray-800 bg-white hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailCaptureModal;
