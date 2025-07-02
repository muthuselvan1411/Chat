import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, X } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import FileUpload from './FileUpload';

interface MessageInputProps {
  onSendMessage: (content: string, fileInfo?: any) => void; // Add fileInfo parameter
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
  isDarkMode: boolean;
  replyingTo?: {
    messageId: string;
    username: string;
    content: string;
  } | null;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  onTyping, 
  placeholder = "Type a message...",
  isDarkMode,
  replyingTo,
  onCancelReply
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Move handleFileUpload inside the component
  const handleFileUpload = async (file: File, message?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const fileInfo = await response.json();
      
      // Send file message
      onSendMessage(message || '', fileInfo);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      handleStopTyping();
      setShowEmojiPicker(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(prevMessage => prevMessage + emoji.native);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="flex-1 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Replying to </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{replyingTo.username}</span>
            <p className="text-gray-600 dark:text-gray-400 truncate">{replyingTo.content}</p>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
        {/* File Upload Component */}
        <FileUpload 
          onFileSelect={handleFileUpload}
          isDarkMode={isDarkMode}
        />
        
        {/* Message Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="chat-input pr-12"
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200"
            aria-label="Toggle emoji picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-20">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme={isDarkMode ? 'dark' : 'light'}
                set="native"
                previewPosition="none"
                skinTonePosition="none"
                emojiSize={20}
                emojiButtonSize={28}
                maxFrequentRows={2}
                perLine={8}
                searchPosition="sticky"
                navPosition="bottom"
              />
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim()}
          className="btn-primary"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
