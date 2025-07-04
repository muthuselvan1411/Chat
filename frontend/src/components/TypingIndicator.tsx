import React from 'react';

interface TypingIndicatorProps {
  users: string[];
  
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing...`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing...`;
    } else {
      return `${users[0]} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getTypingText()}
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;
