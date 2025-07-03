import React, { useEffect, useRef, useState } from 'react';
import { Reply, MoreHorizontal, Clock, Check, CheckCheck, Play, Pause, File, Download } from 'lucide-react';
import { Message } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import MessageReactions from './MessageReactions';

interface MessageListProps {
  messages: Message[];
  currentUsername: string;
  isPrivateChat?: boolean;
  messageReactions?: { [messageId: string]: any[] };
  onAddReaction?: (messageId: string, emoji: string, room: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string, room: string) => void;
  onReply?: (messageId: string, username: string, content: string) => void;
  currentRoom?: string;
  isDarkMode?: boolean;
}

// FileMessage Component for Images and Documents
interface FileMessageProps {
  fileInfo: any;
  isOwn: boolean;
  isDarkMode: boolean;
}

const FileMessage: React.FC<FileMessageProps> = ({ fileInfo, isOwn, isDarkMode }) => {
  const isImage = (type: string) => type.startsWith('image/');
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `http://localhost:8000${fileInfo.url}`;
    link.download = fileInfo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  console.log('🖼️ Rendering file message:', fileInfo);

  if (isImage(fileInfo.type)) {
    return (
      <div className="image-message">
        <img
          src={`http://localhost:8000${fileInfo.url}`}
          alt={fileInfo.filename}
          className="rounded-xl max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
          onClick={() => window.open(`http://localhost:8000${fileInfo.url}`, '_blank')}
          style={{ maxHeight: '300px', width: 'auto' }}
          onLoad={() => console.log('✅ Image loaded successfully')}
          onError={(e) => {
            console.error('❌ Image failed to load:', e);
            console.error('❌ Image URL:', `http://localhost:8000${fileInfo.url}`);
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className={`text-xs ${
            isOwn ? 'text-white/80' : isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {fileInfo.filename} • {formatFileSize(fileInfo.size)}
          </p>
          <button
            onClick={handleDownload}
            className={`p-1 rounded transition-colors ${
              isOwn 
                ? 'hover:bg-white/20 text-white/80' 
                : isDarkMode 
                  ? 'hover:bg-gray-600 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`file-message-bubble flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity ${
        isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
      }`}
      onClick={handleDownload}
    >
      <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${
          isOwn ? 'text-white' : isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          {fileInfo.filename}
        </p>
        <p className={`text-xs ${
          isOwn ? 'text-white/70' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {formatFileSize(fileInfo.size)} • Click to download
        </p>
      </div>
      <Download className="w-5 h-5 text-gray-400" />
    </div>
  );
};

// VoiceMessage Component (your existing one)
interface VoiceMessageProps {
  fileInfo: any;
  isOwn: boolean;
  isDarkMode: boolean;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({ fileInfo, isOwn, isDarkMode }) => {
  // Your existing VoiceMessage implementation
  return (
    <div className="voice-message-container">
      <p>Voice Message: {fileInfo.filename}</p>
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUsername, 
  isPrivateChat = false,
  messageReactions = {},
  onAddReaction,
  onRemoveReaction,
  onReply,
  currentRoom = '',
  isDarkMode: propIsDarkMode
}) => {
  const { isDarkMode: contextIsDarkMode } = useTheme();
  const isDarkMode = propIsDarkMode ?? contextIsDarkMode;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [highlightedMessage, setHighlightedMessage] = useState<string | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  // Debug messages
  // Add this useEffect for debugging (ONLY ONCE at the top of your component)
useEffect(() => {
  console.log('📨 Total messages received:', messages.length);
  messages.forEach((msg, index) => {
    console.log(`📝 Message ${index}:`, {
      id: msg.id,
      type: msg.type,
      content: msg.content,
      hasFile: !!msg.file,
      username: msg.username,
      timestamp: msg.timestamp
    });
    
    if (msg.type === 'file') {
      console.log(`📁 File message details:`, msg.file);
    }
  });
}, [messages]); // This will only run when messages change


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessage(messageId);
      setTimeout(() => {
        setHighlightedMessage(null);
      }, 2000);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getAvatarGradient = (username: string) => {
    const gradients = [
      'from-red-500 to-pink-500',
      'from-blue-500 to-indigo-500',
      'from-green-500 to-teal-500',
      'from-yellow-500 to-orange-500',
      'from-purple-500 to-violet-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-teal-500 to-cyan-500'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[index % gradients.length];
  };

  const handleReply = (message: Message) => {
    if (onReply) {
      onReply(message.id, message.username, message.content);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (onAddReaction && currentRoom) {
      onAddReaction(messageId, emoji, currentRoom);
    }
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    if (onRemoveReaction && currentRoom) {
      onRemoveReaction(messageId, emoji, currentRoom);
    }
  };

  if (!messages || !Array.isArray(messages)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-fade-in-up">
          <div className="loading-skeleton w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className={`text-lg mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="user-avatar w-20 h-20 mx-auto mb-6">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className={`text-xl font-semibold mb-3 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {isPrivateChat ? 'No messages yet' : 'Welcome to the chat!'}
          </h3>
          <p className={`transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isPrivateChat 
              ? 'Start your private conversation by sending a message' 
              : 'Be the first to break the ice and send a message'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-6">
      {messages.map((message, index) => {
        if (!message || !message.id) {
          console.warn('Invalid message at index:', index, message);
          return null;
        }

        const isOwn = message.username === currentUsername;
        const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.username !== message.username);
        const isHighlighted = highlightedMessage === message.id;
        
        const currentMessageReactions = messageReactions && messageReactions[message.id] 
          ? messageReactions[message.id] 
          : [];
        
        return (
          <div
            key={message.id || index}
            ref={(el) => {
              if (el && message.id) {
                messageRefs.current[message.id] = el;
              }
            }}
            className={`flex items-end gap-3 group transition-all duration-300 ${
              message.type === 'system' 
                ? 'justify-center' 
                : isOwn 
                  ? 'justify-end' 
                  : 'justify-start'
            } ${isHighlighted ? 'scale-105' : ''}`}
            onMouseEnter={() => setShowActions(message.id)}
            onMouseLeave={() => setShowActions(null)}
          >
            {/* Avatar for other users */}
            {!isOwn && message.type !== 'system' && (
              <div className="flex-shrink-0 w-10 h-10 mb-1">
                {showAvatar ? (
                  <div className={`user-avatar w-10 h-10 bg-gradient-to-br ${getAvatarGradient(message.username || 'Unknown')}`}>
                    <span className="text-white font-semibold text-sm">
                      {(message.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="w-10 h-10" />
                )}
              </div>
            )}

            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] relative`}>
              {/* Username for group chats */}
              {!isOwn && message.type !== 'system' && showAvatar && !isPrivateChat && (
                <div className={`text-xs font-semibold mb-1 px-3 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {message.username || 'Unknown'}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`message-bubble relative ${
                  message.type === 'system'
                    ? 'message-system'
                    : isOwn
                      ? 'message-own'
                      : 'message-other'
                } ${isHighlighted ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
              >
                {/* CRITICAL: Fixed Message Content Rendering */}
                {(() => {
                  console.log('🔍 Rendering message:', {
                    id: message.id,
                    type: message.type,
                    hasFile: !!message.file,
                    fileType: message.file?.file_type,
                    isVoiceMessage: message.file?.isVoiceMessage,
                    content: message.content,
                    fileInfo: message.file
                  });

                  // Check if it's a file message
                  if (message.type === 'file' && message.file) {
                    // Voice message check
                    if (message.file.isVoiceMessage || message.file.file_type === 'voice') {
                      return (
                        <VoiceMessage 
                          fileInfo={message.file} 
                          isOwn={isOwn} 
                          isDarkMode={isDarkMode} 
                        />
                      );
                    }
                    // Regular file message (images, documents, etc.)
                    else {
                      return (
                        <FileMessage 
                          fileInfo={message.file} 
                          isOwn={isOwn} 
                          isDarkMode={isDarkMode} 
                        />
                      );
                    }
                  }
                  
                  // Regular text message
                  return (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content || ''}
                    </div>
                  );
                })()}

                {/* Timestamp */}
                <div className={`flex items-center gap-1 text-xs mt-2 ${
                  message.type === 'system' 
                    ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                    : isOwn 
                      ? 'text-white/70' 
                      : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(message.timestamp)}</span>
                  {isOwn && (
                    <div className="ml-1">
                      {message.status === 'sent' && <Check className="w-3 h-3" />}
                      {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                      {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {showActions === message.id && message.type !== 'system' && (onAddReaction || onReply) && (
                  <div className={`absolute ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-0 flex items-center gap-1 glass-effect rounded-xl shadow-xl p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 animate-fade-in`}>
                    {onAddReaction && (
                      <>
                        <button
                          onClick={() => handleAddReaction(message.id, '❤️')}
                          className={`p-1.5 rounded-lg text-sm transition-all duration-200 hover:scale-110 ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                          title="Love"
                        >
                          ❤️
                        </button>
                        <button
                          onClick={() => handleAddReaction(message.id, '👍')}
                          className={`p-1.5 rounded-lg text-sm transition-all duration-200 hover:scale-110 ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                          title="Like"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleAddReaction(message.id, '😂')}
                          className={`p-1.5 rounded-lg text-sm transition-all duration-200 hover:scale-110 ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                          title="Laugh"
                        >
                          😂
                        </button>
                      </>
                    )}
                    {onReply && (
                      <button
                        onClick={() => handleReply(message)}
                        className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                    )}
                    <button 
                      className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      title="More options"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Message Reactions */}
              {currentMessageReactions.length > 0 && MessageReactions && (
                <div className="mt-2 animate-fade-in">
                  <MessageReactions
                    messageId={message.id}
                    reactions={currentMessageReactions}
                    currentUsername={currentUsername}
                    onAddReaction={onAddReaction ? (messageId, emoji) => handleAddReaction(messageId, emoji) : undefined}
                    onRemoveReaction={onRemoveReaction ? (messageId, emoji) => handleRemoveReaction(messageId, emoji) : undefined}
                  />
                </div>
              )}
            </div>

            {/* Spacer for own messages */}
            {isOwn && <div className="w-10" />}
          </div>
        );
      })}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
};

export default MessageList;
