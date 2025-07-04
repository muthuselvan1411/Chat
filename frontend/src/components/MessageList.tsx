import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, File, Download } from 'lucide-react';
import { Message } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import MessageReactions from './MessageReactions';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUsername: string;
  isPrivateChat?: boolean;
  messageReactions?: { [messageId: string]: any[] };
  onAddReaction?: (messageId: string, emoji: string, room: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string, room: string) => void;
  onReply?: (messageId: string, username: string, content: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
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

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `https://mumegle.up.railway.app${fileInfo.url}`;
    link.download = fileInfo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isImage(fileInfo.type)) {
    return (
      <div className="image-message">
        <img
          src={`https://mumegle.up.railway.app${fileInfo.url}`}
          alt={fileInfo.filename}
          className="rounded-xl max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://mumegle.up.railway.app${fileInfo.url}`, '_blank');
          }}
          style={{ maxHeight: '300px', width: 'auto', pointerEvents: 'auto' }}
          onLoad={() => console.log('✅ Image loaded successfully')}
          onError={(e) => {
            console.error('❌ Image failed to load:', e);
            console.error('❌ Image URL:', `https://mumegle.up.railway.app${fileInfo.url}`);
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
            style={{ pointerEvents: 'auto' }}
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
      style={{ pointerEvents: 'auto' }}
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

// VoiceMessage Component
interface VoiceMessageProps {
  fileInfo: any;
  isOwn: boolean;
  isDarkMode: boolean;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({ fileInfo, isOwn, isDarkMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fileInfo.duration || 0);
  const [audioLevels] = useState<number[]>(fileInfo.waveform || []);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = (e: any) => {
      console.error('❌ Audio playback error:', e);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.error('❌ Audio play failed:', error);
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayLevels = audioLevels.length > 0 ? audioLevels : Array(20).fill(0.3);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl min-w-[200px] max-w-[300px] transition-all duration-200 ${
      isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700/70' : 'bg-gray-100 hover:bg-gray-200'
    }`}>
      <audio 
        ref={audioRef} 
        src={`https://mumegle.up.railway.app${fileInfo.url}`}
        preload="metadata"
      />
      
      <button
        onClick={togglePlay}
        className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
          isOwn 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : isDarkMode
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 space-y-1">
        <div className="relative h-6 flex items-center">
          <div className="flex items-center gap-0.5 h-full w-full">
            {displayLevels.map((level: number, index: number) => (
              <div
                key={index}
                className={`rounded-full transition-all duration-200 ${
                  (index / displayLevels.length) * 100 <= progress
                    ? isOwn 
                      ? 'bg-white' 
                      : 'bg-blue-500'
                    : isOwn
                      ? 'bg-white/30'
                      : isDarkMode 
                        ? 'bg-gray-500' 
                        : 'bg-gray-400'
                }`}
                style={{
                  width: '2px',
                  height: `${Math.max(4, level * 20)}px`,
                  flex: 1
                }}
              />
            ))}
          </div>
        </div>
        
        <div className={`text-xs font-medium voice-message-text ${
          isOwn 
            ? 'text-white/90' 
            : isDarkMode 
              ? 'text-gray-200' 
              : 'text-gray-700'
        }`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
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
  onEditMessage,
  onDeleteMessage,
  currentRoom = '',
  isDarkMode: propIsDarkMode
}) => {
  const { isDarkMode: contextIsDarkMode } = useTheme();
  const isDarkMode = propIsDarkMode ?? contextIsDarkMode;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [highlightedMessage,setHighlightedMessage] = useState<string | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  useEffect(() => {
  const hash = window.location.hash; // e.g., #message-123
  const id = hash?.replace('#message-', '');
  if (id && messageRefs.current[id]) {
    messageRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessage(id); // Highlight the message
    setTimeout(() => setHighlightedMessage(null), 2000); // Remove highlight after 2 seconds
  }
}, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isDarkMode 
              ? 'bg-gray-700/50 text-gray-400' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          
          <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {isPrivateChat ? 'No messages yet' : 'Welcome to the conversation'}
          </h3>
          <p className={`text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            {isPrivateChat 
              ? 'Start your private conversation by sending a message' 
              : 'Send a message to begin the discussion'
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
            className={`flex items-end gap-3 transition-all duration-300 ${
              message.type === 'system' 
                ? 'justify-center' 
                : isOwn 
                  ? 'justify-end' 
                  : 'justify-start'
            } ${isHighlighted ? 'scale-105' : ''}`}
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

              {/* Enhanced Message Bubble with Touch Gestures */}
              <MessageBubble
                message={message}
                isOwn={isOwn}
                isDarkMode={isDarkMode}
                currentUsername={currentUsername}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onReply={onReply}
                onAddReaction={(messageId, emoji) => handleAddReaction(messageId, emoji)}
                formatTime={formatTime}
              >
                {/* Message Content */}
                {(() => {
                  if (message.type === 'file' && message.file) {
                    if (message.file.isVoiceMessage || message.file.file_type === 'voice') {
                      return (
                        <VoiceMessage 
                          fileInfo={message.file} 
                          isOwn={isOwn} 
                          isDarkMode={isDarkMode} 
                        />
                      );
                    } else {
                      return (
                        <FileMessage 
                          fileInfo={message.file} 
                          isOwn={isOwn} 
                          isDarkMode={isDarkMode} 
                        />
                      );
                    }
                  }
                  
                  return (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content || ''}
                    </div>
                  );
                })()}
              </MessageBubble>

              {/* Message Reactions - Fixed TypeScript errors */}
              {currentMessageReactions.length > 0 && MessageReactions && (
                <div className="mt-2 animate-fade-in">
                  <MessageReactions
                    messageId={message.id}
                    reactions={currentMessageReactions}
                    currentUsername={currentUsername}
                    onAddReaction={onAddReaction ? (messageId, emoji) => handleAddReaction(messageId, emoji) : () => {}}
                    onRemoveReaction={onRemoveReaction ? (messageId, emoji) => handleRemoveReaction(messageId, emoji) : () => {}}
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
