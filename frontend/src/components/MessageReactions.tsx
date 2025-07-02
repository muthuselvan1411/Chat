import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUsername: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUsername,
  onAddReaction,
  onRemoveReaction
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // WhatsApp/Instagram style common emojis
  const commonEmojis = [
    '❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🙏',
    '👏', '🔥', '🥰', '😍', '🤔', '😊', '😎', '🎉',
    '💯', '✨', '⚡', '💪', '🙌', '👌', '✅', '❌'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactionClick = (emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    const userHasReacted = reaction?.users.includes(currentUsername);

    if (userHasReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      // Remove any existing reaction from this user first (one reaction per user)
      const existingUserReaction = reactions.find(r => r.users.includes(currentUsername));
      if (existingUserReaction) {
        onRemoveReaction(messageId, existingUserReaction.emoji);
      }
      onAddReaction(messageId, emoji);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    handleReactionClick(emoji);
    setShowEmojiPicker(false);
  };

  if (reactions.length === 0 && !showEmojiPicker) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1 relative">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 min-w-[32px] h-6 ${
            reaction.users.includes(currentUsername)
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
          }`}
          title={`${reaction.users.join(', ')} reacted with ${reaction.emoji}`}
        >
          <span className="text-sm">{reaction.emoji}</span>
          {reaction.count > 1 && (
            <span className="text-xs font-semibold">{reaction.count}</span>
          )}
        </button>
      ))}
      
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-gray-500 dark:text-gray-400"
          title="Add reaction"
        >
          <Plus className="w-3 h-3" />
        </button>
        
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 p-3 min-w-[280px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Choose a reaction
              </span>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-lg flex items-center justify-center"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;
