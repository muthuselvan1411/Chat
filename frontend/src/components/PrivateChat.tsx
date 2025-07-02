import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, MessageCircle, Send, Smile, Paperclip, Search, Info } from 'lucide-react';
import { User, Message } from '../types';
import { useSocket } from '../hooks/useSocket';

interface PrivateChatProps {
  user: User;
  messages: Message[];
  currentUsername: string;
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  onBack: () => void;
}

const PrivateChat: React.FC<PrivateChatProps> = ({
  user,
  messages,
  currentUsername,
  onSendMessage,
  onTyping,
  onBack
}) => {
  const { socket } = useSocket('http://localhost:8000');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: any) => {
      console.log('👀 Typing event received in PrivateChat:', data);
      
      if (data.isPrivate && data.userId === user.id) {
        console.log('👀 Setting partner typing to:', data.typing);
        setIsPartnerTyping(data.typing);
        
        if (data.typing) {
          if (typingTimeout) clearTimeout(typingTimeout);
          const timeout = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3000);
          setTypingTimeout(timeout);
        } else {
          if (typingTimeout) clearTimeout(typingTimeout);
        }
      }
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [socket, user.id, typingTimeout]);

  // Handle input change with typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Start typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping(true);
      console.log('👀 Started typing in private chat');
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
        console.log('👀 Stopped typing in private chat (timeout)');
      }
    }, 1000);
  };

  // Handle message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      if (replyingTo) {
        onSendMessage(`@${replyingTo.username}: ${message.trim()}`);
        setReplyingTo(null);
      } else {
        onSendMessage(message.trim());
      }
      setMessage('');
      
      // Stop typing indicator immediately
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
        console.log('👀 Stopped typing (message sent)');
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Handle reactions
  const handleReaction = (messageId: string, emoji: string) => {
    console.log('Adding reaction:', emoji, 'to message:', messageId);
  };

  // Handle reply
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900"> {/* Fixed: Added w-full */}
      {/* Enhanced Header */}
      <div className="w-full bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
              title="Back to main chat"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
            
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-white">
                {user.username}
              </h1>
              <div className="flex items-center gap-2 text-sm">
                {isPartnerTyping ? (
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span>typing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {user.isOnline ? 'Online' : 'Offline'} • Private Chat
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors duration-200">
              <Search className="w-4 h-4 text-gray-300" />
            </button>
            <button className="p-2 rounded-full bg-green-600 hover:bg-green-700 transition-colors duration-200">
              <Phone className="w-4 h-4 text-white" />
            </button>
            <button className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
              <Video className="w-4 h-4 text-white" />
            </button>
            <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors duration-200">
              <Info className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area - Fixed scrolling */}
      <div className="flex-1 w-full overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-400">
                Send a message to {user.username} to get started
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.username === currentUsername;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.username !== message.username);
              
              return (
                <div
                  key={message.id || index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group w-full`}
                >
                  <div className={`flex items-end gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for other user */}
                    {!isOwn && (
                      <div className="flex-shrink-0 w-8 h-8">
                        {showAvatar ? (
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-xs">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                      {/* Username for first message */}
                      {!isOwn && showAvatar && (
                        <span className="text-xs text-gray-400 mb-1 px-3">
                          {user.username}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-full break-words relative ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-700 text-white rounded-bl-md'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        
                        {/* Timestamp */}
                        <div className={`text-xs mt-1 ${
                          isOwn 
                            ? 'text-blue-200' 
                            : 'text-gray-400'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>

                        {/* Quick Actions on Hover */}
                        <div className={`absolute top-0 ${isOwn ? 'left-0' : 'right-0'} transform ${isOwn ? '-translate-x-full' : 'translate-x-full'} flex items-center gap-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}>
                          <button
                            onClick={() => handleReaction(message.id, '❤️')}
                            className="p-1 hover:bg-gray-700 rounded text-sm"
                            title="Love"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleReaction(message.id, '👍')}
                            className="p-1 hover:bg-gray-700 rounded text-sm"
                            title="Like"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleReaction(message.id, '😂')}
                            className="p-1 hover:bg-gray-700 rounded text-sm"
                            title="Laugh"
                          >
                            😂
                          </button>
                          <button
                            onClick={() => handleReply(message)}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Reply"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex justify-start mb-4 animate-fade-in">
                <div className="flex items-end gap-2 max-w-[80%]">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="w-full bg-gray-800 border-t border-gray-700 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400">Replying to</span>
              <span className="text-white font-medium">{replyingTo.username}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-300 truncate mt-1">{replyingTo.content}</p>
        </div>
      )}

      {/* Enhanced Message Input */}
      <div className="w-full bg-gray-800 border-t border-gray-700 px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors duration-200 flex-shrink-0"
          >
            <Paperclip className="w-5 h-5 text-gray-300" />
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : `Message ${user.username}...`}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
              maxLength={500}
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrivateChat;
