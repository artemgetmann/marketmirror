import React, { useState } from 'react';
import { getAdminToken, isAdminAuthenticated, adminLogout } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { X, LogIn, LogOut, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLogin({ isOpen, onClose }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isAdminAuthenticated());

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = await getAdminToken(password);
      if (token) {
        setIsAuthenticated(true);
        toast({
          title: 'Admin Login Successful',
          description: 'You now have developer access.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Admin Login Failed',
          description: 'Invalid credentials.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Admin Login Failed',
        description: 'An error occurred during login.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  const handleLogout = () => {
    adminLogout();
    setIsAuthenticated(false);
    toast({
      title: 'Logged Out',
      description: 'Admin access revoked.',
      variant: 'default',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-gray-900">
            Developer Access
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="py-4">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-lg">
                <KeyRound className="mr-2" size={18} />
                <span>You have developer access</span>
              </div>
              <p className="text-sm text-gray-600">
                Your admin access allows you to bypass rate limits and access developer features.
              </p>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter developer password"
                  className="w-full"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  'Authenticating...'
                ) : (
                  <>
                    <LogIn size={18} />
                    Login as Developer
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
