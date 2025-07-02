import React from 'react';
import { MessageCircle } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        </div>

        {/* Loading Text */}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Joining Chat Room
        </h2>
        
        {/* Animated Dots */}
        <div className="flex justify-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>

        {/* Progress Steps */}
        <div className="mt-8 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Connecting to server</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Setting up chat room</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span>Loading messages</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
