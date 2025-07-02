import React, { useState } from 'react';
import { MessageCircle, Users, Video, Sparkles } from 'lucide-react';
import ChatRoom from './components/ChatRoom';
import StrangerChat from './components/StrangerChat';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import './index.css';

const AppContent: React.FC = () => {
  const [appMode, setAppMode] = useState<'selection' | 'regular' | 'stranger'>('selection');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('general');
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleRegularChatJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAppMode('regular');
      setIsJoined(true);
      setIsLoading(false);
    }
  };

  const handleStrangerChatStart = () => {
    setAppMode('stranger');
  };

  const handleBackToSelection = () => {
    setAppMode('selection');
    setIsJoined(false);
    setUsername('');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (appMode === 'regular' && isJoined) {
    return <ChatRoom username={username} roomId={roomId} onBack={handleBackToSelection} />;
  }

  if (appMode === 'stranger') {
    return <StrangerChat onBack={handleBackToSelection} />;
  }

  // Mode Selection Screen - FIXED SCROLLING
  return (
    <div className="min-h-screen w-full overflow-y-auto overflow-x-hidden"> {/* Fixed: Added overflow properties */}
      {/* Fixed Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 transition-colors duration-1000 -z-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Content Container - Fixed padding and spacing */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-4 py-16">
        <div className="glass-effect rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-6xl animate-fade-in-up"> {/* Increased max-width */}
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleTheme}
                className="floating-button"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 sm:mb-8 animate-glow">
              <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              ChatFlow Pro
            </h1>
            
            <p className="text-gray-600 dark:text-gray-300 text-lg sm:text-xl mb-2">
              Choose Your Chat Experience
            </p>
            
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Connect with friends in rooms or meet strangers worldwide
            </p>
          </div>

          {/* Chat Mode Selection - Responsive grid */}
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
            {/* Regular Chat Rooms */}
            <div className="glass-effect rounded-2xl p-6 sm:p-8 hover:scale-105 transition-all duration-300 cursor-pointer group">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Chat Rooms
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm sm:text-base">
                  Join themed rooms, chat with multiple people, share files, and react to messages
                </p>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
                  />
                  
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white"
                  >
                    <option value="general">🌍 General Discussion</option>
                    <option value="random">🎲 Random Chat</option>
                    <option value="tech">💻 Tech Talk</option>
                    <option value="gaming">🎮 Gaming Zone</option>
                    <option value="music">🎵 Music Lounge</option>
                    <option value="movies">🎬 Movie Club</option>
                  </select>

                  <button
                    onClick={handleRegularChatJoin}
                    disabled={!username.trim()}
                    className="w-full btn-primary text-lg font-semibold py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Join Chat Room
                  </button>
                </div>

                <div className="mt-6 flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span>Reactions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span>Private Chat</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stranger Chat */}
            <div className="glass-effect rounded-2xl p-6 sm:p-8 hover:scale-105 transition-all duration-300 cursor-pointer group">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Video className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Stranger Chat
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm sm:text-base">
                  Meet random strangers worldwide with text and video chat. Skip to find new people instantly
                </p>

                <button
                  onClick={handleStrangerChatStart}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 text-lg"
                >
                  Start Stranger Chat
                </button>

                <div className="mt-6 flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4 text-purple-500" />
                    <span>Video Chat</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-pink-500" />
                    <span>Anonymous</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                  ⚠️ Be respectful and follow community guidelines
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Built with React, TypeScript, Socket.IO & WebRTC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
