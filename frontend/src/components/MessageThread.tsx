import React from 'react';
import { Reply, CornerDownRight } from 'lucide-react';

interface ReplyPreviewProps {
  originalMessage: {
    username: string;
    content: string;
  };
  onReply: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ originalMessage, onReply }) => {
  return (
    <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
        <CornerDownRight className="w-3 h-3" />
        <span>Replying to {originalMessage.username}</span>
      </div>
      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
        {originalMessage.content}
      </p>
    </div>
  );
};

export default ReplyPreview;
