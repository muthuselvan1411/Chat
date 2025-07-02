import React, { useEffect, useRef, useState } from 'react';
import { Reply, MoreHorizontal } from 'lucide-react';
import { Message } from '../types';
import MessageReactions from './MessageReactions';

interface MessageListProps {
  messages: Message[];
  currentUsername: string;
  isPrivateChat?: boolean;
  messageReactions?: { [messageId: string]: any[] }; // Make optional
  onAddReaction?: (messageId: string, emoji: string, room: string) => void; // Make optional
  onRemoveReaction?: (messageId: string, emoji: string, room: string) => void; // Make optional
  onReply?: (messageId: string, username: string, content: string) => void; // Make optional
  currentRoom?: string; // Make optional
  isDarkMode?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUsername, 
  isPrivateChat = false,
  messageReactions = {}, // Provide default empty object
  onAddReaction,
  onRemoveReaction,
  onReply,
  currentRoom = '',
  isDarkMode = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900');
      }, 2000);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add safety check for messages
  if (!messages || !Array.isArray(messages)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">Loading messages...</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
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

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">
            {isPrivateChat ? 'No messages yet' : 'Welcome to the chat!'}
          </p>
          <p className="text-sm">
            {isPrivateChat ? 'Start your private conversation' : 'Be the first to send a message'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-4">
      {messages.map((message, index) => {
        // Safety check for message
        if (!message || !message.id) {
          console.warn('Invalid message at index:', index, message);
          return null;
        }

        const isOwn = message.username === currentUsername;
        const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.username !== message.username);
        
        // Safe access to message reactions
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
            className={`flex items-end gap-2 group transition-colors duration-200 ${
              message.type === 'system' 
                ? 'justify-center' 
                : isOwn 
                  ? 'justify-end' 
                  : 'justify-start'
            }`}
            onMouseEnter={() => setShowActions(message.id)}
            onMouseLeave={() => setShowActions(null)}
          >
            {/* Avatar for other users */}
            {!isOwn && message.type !== 'system' && (
              <div className="flex-shrink-0 w-8 h-8 mb-1">
                {showAvatar ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(message.username || 'Unknown')}`}>
                    {(message.username || 'U').charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-8 h-8" /> // Spacer
                )}
              </div>
            )}

            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
              {/* Reply Preview */}
              {message.replyTo && (
                <button
                  onClick={() => scrollToMessage(message.replyTo!.messageId)}
                  className="mb-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 text-left hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 w-full"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <Reply className="w-3 h-3" />
                    <span>{message.replyTo.username}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {message.replyTo.content}
                  </p>
                </button>
              )}

              {/* Message Bubble */}
              <div
                className={`relative px-3 py-2 rounded-2xl max-w-full break-words shadow-sm ${
                  message.type === 'system'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center text-sm mx-auto px-4 py-1'
                    : isOwn
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
                }`}
              >
                {/* Username for group chats */}
                {!isOwn && message.type !== 'system' && showAvatar && !isPrivateChat && (
                  <div className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">
                    {message.username || 'Unknown'}
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm whitespace-pre-wrap">{message.content || ''}</div>

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${
                  message.type === 'system' 
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : isOwn 
                      ? 'text-blue-100' 
                      : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {formatTime(message.timestamp)}
                </div>

                {/* Quick Actions on Hover - Only show if handlers are available */}
                {showActions === message.id && message.type !== 'system' && (onAddReaction || onReply) && (
                  <div className={`absolute top-0 ${isOwn ? 'left-0' : 'right-0'} transform ${isOwn ? '-translate-x-full' : 'translate-x-full'} flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}>
                    {onAddReaction && (
                      <>
                        <button
                          onClick={() => handleAddReaction(message.id, '❤️')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          title="Love"
                        >
                          ❤️
                        </button>
                        <button
                          onClick={() => handleAddReaction(message.id, '👍')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          title="Like"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleAddReaction(message.id, '😂')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          title="Laugh"
                        >
                          😂
                        </button>
                      </>
                    )}
                    {onReply && (
                      <button
                        onClick={() => handleReply(message)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                    )}
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="More"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Message Reactions - Only show if reactions exist and MessageReactions component is available */}
              {currentMessageReactions.length > 0 && MessageReactions && (
                <div className="mt-1">
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
            {isOwn && <div className="w-8" />}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
