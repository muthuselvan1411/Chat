import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import FileUpload from './FileUpload';
import VoiceRecorder from './VoiceRecorder';
import { useTheme } from '../contexts/ThemeContext';

interface MessageInputProps {
  onSendMessage: (content: string, fileInfo?: any) => void;
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
  isDarkMode: propIsDarkMode,
  replyingTo,
  onCancelReply
}) => {
  const { isDarkMode: contextIsDarkMode } = useTheme();
  const isDarkMode = propIsDarkMode ?? contextIsDarkMode;

  // Text message states
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs
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

  // File upload handler
  const handleFileUpload = async (file: File, message?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const fileInfo = await response.json();
      onSendMessage(message || '', fileInfo);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  // Voice message handler
  const handleVoiceMessage = async (audioBlob: Blob, duration: number, waveform?: number[]) => {
    try {
      console.log('📤 Sending voice message...', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append('file', audioBlob, `voice-${Date.now()}.webm`);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const fileInfo = await response.json();
      console.log('✅ Voice message uploaded:', fileInfo);
      
      // Send as file message with proper structure
      onSendMessage('🎤 Voice message', {
        ...fileInfo,
        isVoiceMessage: true,
        duration: duration,
        waveform: waveform,
        file_type: 'voice'
      });
      
    } catch (error) {
      console.error('❌ Voice message upload error:', error);
      alert('Failed to send voice message. Please try again.');
    }
  };

  // Text message functions
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
        <div className="glass-effect rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Replying to
              </span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {replyingTo.username}
              </span>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className={`text-lg leading-none ${
                  isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ×
              </button>
            )}
          </div>
          <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
        {/* File Upload Component */}
        <FileUpload 
          onFileSelect={handleFileUpload}
          isDarkMode={isDarkMode}
        />
        
        {/* Professional Voice Recorder */}
        <VoiceRecorder
          onVoiceMessage={handleVoiceMessage}
          isDarkMode={isDarkMode}
          disabled={false}
          maxDuration={300} // 5 minutes
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
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors duration-200 ${
              isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-500'
            }`}
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
