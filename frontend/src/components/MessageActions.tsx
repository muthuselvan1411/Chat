import React, { useState } from 'react';
import { Edit3, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
import { Message } from '../types';

interface MessageActionsProps {
  message: Message;
  currentUsername: string;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  isDarkMode: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  currentUsername,
  onEdit,
  onDelete,
  isDarkMode
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = message.username === currentUsername;
  const canEdit = isOwnMessage && message.type !== 'file' && message.type !== 'system';
  const canDelete = isOwnMessage && message.type !== 'system';

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
    setShowActions(false);
  };

  if (!isOwnMessage) return null;

  return (
    <div className="relative">
      {isEditing ? (
        // Edit Mode
        <div className="mt-2 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`w-full p-2 rounded-lg border resize-none ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            rows={2}
            maxLength={500}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
              disabled={!editContent.trim()}
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                isDarkMode 
                  ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Action Buttons
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
              isDarkMode 
                ? 'hover:bg-gray-600 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Message options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions && (
            <div className={`absolute bottom-full right-0 mb-2 rounded-lg shadow-lg border z-20 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              {canEdit && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowActions(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
