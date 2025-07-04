import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, CheckCheck, Edit3, Trash2, Reply, Copy, Forward, Star } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isDarkMode: boolean;
  currentUsername: string;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string, username: string, content: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  formatTime: (timestamp: string) => string;
  children: React.ReactNode;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isDarkMode,
  currentUsername,
  onEdit,
  onDelete,
  onReply,
  onAddReaction,
  formatTime,
  children
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  
  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle right-click context menu with FIXED positioning
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (message.type === 'system') return;
    
    console.log('🖱️ Right click detected on message:', message.id, 'isOwn:', isOwn);
    
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 220;
    const menuHeight = isOwn ? 280 : 120;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // FIXED: Better positioning logic
    if (isOwn) {
      // For own messages (right side), show menu to the left
      x = rect.left - menuWidth - 10;
      // If not enough space on left, show on right
      if (x < 10) {
        x = rect.right + 10;
      }
      y = rect.top;
    } else {
      // For other messages (left side), show menu to the right
      x = rect.right + 10;
      // If not enough space on right, show on left
      if (x + menuWidth > window.innerWidth - 10) {
        x = rect.left - menuWidth - 10;
      }
      y = rect.top;
    }
    
    // Prevent vertical overflow
    if (y + menuHeight > window.innerHeight - 10) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // Ensure minimum margins
    x = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
    y = Math.max(10, y);
    
    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
    
    console.log('📍 Menu position:', { x, y, isOwn, rectLeft: rect.left, rectRight: rect.right });
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    const handleScroll = () => {
      setShowContextMenu(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showContextMenu]);

  // Reply Handler
  const handleReply = () => {
    console.log('💬 Reply clicked');
    if (onReply) {
      onReply(message.id, message.username, message.content);
    }
    setShowContextMenu(false);
  };

  // Copy Handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      console.log('📋 Message copied');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShowContextMenu(false);
  };

  // Edit Handler
  const handleEdit = () => {
    if (message.type === 'file') {
      alert('File messages cannot be edited');
      return;
    }
    console.log('✏️ Edit clicked');
    setIsEditing(true);
    setShowContextMenu(false);
  };

  // Delete Handler
  const handleDelete = () => {
    if (window.confirm('Delete this message?')) {
      console.log('🗑️ Delete confirmed for message:', message.id);
      if (onDelete) {
        onDelete(message.id);
      }
    }
    setShowContextMenu(false);
  };

  // Reaction Handler
  const handleReaction = (emoji: string) => {
    console.log('😀 Reaction clicked:', emoji);
    if (onAddReaction) {
      onAddReaction(message.id, emoji);
    }
    setShowContextMenu(false);
  };

  // Edit Save Handler
  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content && onEdit) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  // Edit Cancel Handler
  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <>
      <div className="relative">
        <div
          ref={bubbleRef}
          className={`message-bubble relative cursor-pointer ${
            message.type === 'system'
              ? 'message-system'
              : isOwn
                ? 'message-own'
                : 'message-other'
          }`}
          onContextMenu={handleContextMenu}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <div className={`mb-3 p-3 rounded-lg border-l-4 border-blue-500 ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`flex items-center gap-2 text-xs mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Reply className="w-3 h-3" />
                <span className="font-medium">{message.replyTo.username}</span>
              </div>
              <p className={`text-sm truncate ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {message.replyTo.content}
              </p>
            </div>
          )}

          {/* Message Content */}
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={`w-full p-3 rounded-lg border resize-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                rows={3}
                maxLength={500}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                  disabled={!editContent.trim()}
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            children
          )}

          {/* Timestamp with Edit Indicator */}
          {!isEditing && (
            <div className={`flex items-center gap-1 text-xs mt-2 ${
              message.type === 'system' 
                ? isDarkMode ? 'text-gray-400' : 'text-gray-600'
                : isOwn 
                  ? 'text-white/70' 
                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.timestamp)}</span>
              {message.edited && (
                <span className="text-xs opacity-75">(edited)</span>
              )}
              {isOwn && (
                <div className="ml-1">
                  {message.status === 'sent' && <Check className="w-3 h-3" />}
                  {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                  {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIXED Context Menu with Portal */}
      {showContextMenu && (
        <div
          ref={menuRef}
          className={`fixed z-[9999] rounded-xl shadow-2xl border backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-gray-800/95 border-gray-700' 
              : 'bg-white/95 border-gray-200'
          }`}
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
            minWidth: '200px',
          }}
        >
          {/* Reply Option - Always available */}
          <button
            onClick={handleReply}
            className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-xl ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>

          {/* Copy Option */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>

          {/* Own Message Options */}
          {isOwn && (
            <>
              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                <Forward className="w-4 h-4" />
                Forward
              </button>

              <button
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                <Star className="w-4 h-4" />
                Star
              </button>

              {message.type !== 'file' && (
                <button
                  onClick={handleEdit}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}

              <button
                onClick={handleDelete}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700 last:rounded-b-xl"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}

          {/* Other User's Message - Reactions */}
          {!isOwn && (
            <div className="border-t border-gray-100 dark:border-gray-700 p-3 rounded-b-xl">
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleReaction('👍')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                  title="Like"
                >
                  👍
                </button>
                <button
                  onClick={() => handleReaction('❤️')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                  title="Love"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleReaction('😂')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                  title="Laugh"
                >
                  😂
                </button>
                <button
                  onClick={() => handleReaction('😮')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                  title="Wow"
                >
                  😮
                </button>
                <button
                  onClick={() => handleReaction('😢')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                  title="Sad"
                >
                  😢
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MessageBubble;
