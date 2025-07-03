import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Video, MessageCircle, Send, Paperclip } from 'lucide-react';
import { User, Message } from '../types';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../contexts/ThemeContext';
import VideoCall from './VideoCall';

interface PrivateChatProps {
  user: User;
  messages: Message[];
  currentUsername: string;
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  onBack: () => void;
}

const PrivateChat: React.FC<PrivateChatProps> = ({
  user,
  messages,
  currentUsername,
  onSendMessage,
  onTyping,
  onBack
}) => {
  const { socket } = useSocket('http://localhost:8000');
  const { isDarkMode } = useTheme();
  
  // Chat states
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  
  // Video call states
  const [inVideoCall, setInVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [videoCallRoom, setVideoCallRoom] = useState<string | null>(null);
  const [videoCallInitiator, setVideoCallInitiator] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Enhanced typing and video call listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: any) => {
      console.log('👀 Typing event received in PrivateChat:', data);
      
      if (data.isPrivate && data.userId === user.id) {
        console.log('👀 Setting partner typing to:', data.typing);
        setIsPartnerTyping(data.typing);
        
        if (data.typing) {
          if (typingTimeout) clearTimeout(typingTimeout);
          const timeout = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3000);
          setTypingTimeout(timeout);
        } else {
          if (typingTimeout) clearTimeout(typingTimeout);
        }
      }
    };

    // Video call event handlers
    const handleIncomingPrivateVideoCall = (data: any) => {
      console.log('📞 Incoming private video call:', data);
      setIncomingCall(data);
    };

    const handlePrivateVideoCallInitiated = (data: any) => {
      console.log('📞 Private video call initiated:', data);
      setVideoCallRoom(data.room_id);
      setVideoCallInitiator(data.initiator);
    };

    const handlePrivateVideoCallAccepted = (data: any) => {
      console.log('✅ Private video call accepted:', data);
      setInVideoCall(true);
      setIncomingCall(null);
      setVideoCallRoom(data.room_id);
      setVideoCallInitiator(data.initiator);
    };

    const handlePrivateVideoCallRejected = () => {
      console.log('❌ Private video call rejected');
      setIncomingCall(null);
      setVideoCallRoom(null);
      setVideoCallInitiator(null);
    };

    const handlePrivateVideoCallEnded = () => {
      console.log('📞 Private video call ended');
      setInVideoCall(false);
      setIncomingCall(null);
      setVideoCallRoom(null);
      setVideoCallInitiator(null);
    };

    socket.on('user_typing', handleUserTyping);
    socket.on('incoming_private_video_call', handleIncomingPrivateVideoCall);
    socket.on('private_video_call_initiated', handlePrivateVideoCallInitiated);
    socket.on('private_video_call_accepted', handlePrivateVideoCallAccepted);
    socket.on('private_video_call_rejected', handlePrivateVideoCallRejected);
    socket.on('private_video_call_ended', handlePrivateVideoCallEnded);

    return () => {
      socket.off('user_typing', handleUserTyping);
      socket.off('incoming_private_video_call', handleIncomingPrivateVideoCall);
      socket.off('private_video_call_initiated', handlePrivateVideoCallInitiated);
      socket.off('private_video_call_accepted', handlePrivateVideoCallAccepted);
      socket.off('private_video_call_rejected', handlePrivateVideoCallRejected);
      socket.off('private_video_call_ended', handlePrivateVideoCallEnded);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [socket, user.id, typingTimeout]);

  // Video call functions
  const startVideoCall = () => {
    if (!socket) return;
    console.log('📞 Starting private video call with:', user.id);
    socket.emit('start_private_video_call', {
      target_user_id: user.id
    });
  };

  const acceptVideoCall = (roomId: string) => {
    if (!socket) return;
    console.log('✅ Accepting private video call');
    socket.emit('accept_private_video_call', { room_id: roomId });
  };

  const rejectVideoCall = (roomId: string) => {
    if (!socket) return;
    console.log('❌ Rejecting private video call');
    socket.emit('reject_private_video_call', { room_id: roomId });
  };

  const endVideoCall = () => {
    if (!socket || !videoCallRoom) return;
    console.log('📞 Ending private video call');
    socket.emit('end_private_video_call', { room_id: videoCallRoom });
  };

  const isVideoCallInitiator = () => {
    return videoCallInitiator === socket?.id;
  };

  // If in video call, show video component
  if (inVideoCall && videoCallRoom) {
    return (
      <VideoCall
        roomId={videoCallRoom}
        isInitiator={isVideoCallInitiator()}
        onEndCall={endVideoCall}
        onBack={onBack}
        partnerName={user.username}
        socket={socket}
      />
    );
  }

  // Message handling functions
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
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      if (replyingTo) {
        onSendMessage(`@${replyingTo.username}: ${message.trim()}`);
        setReplyingTo(null);
      } else {
        onSendMessage(message.trim());
      }
      setMessage('');
      
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`w-full h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Professional Header */}
      <div className={`w-full border-b px-6 py-4 flex-shrink-0 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Back to main chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="user-avatar w-12 h-12">
                  <span className="text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className={`status-indicator absolute -bottom-0.5 -right-0.5 ${
                  user.isOnline ? 'status-online' : 'status-offline'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user.username}
                </h1>
                
                {/* Enhanced Typing Indicator - Positioned below avatar */}
                <div className="flex items-center gap-2 text-sm min-h-5">
                  {isPartnerTyping ? (
                    <div className="flex items-center gap-2 text-blue-500 animate-fade-in">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="font-medium">typing...</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span>{user.isOnline ? 'Online' : 'Offline'} • Private Chat</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={startVideoCall}
              className="floating-button"
              title="Start video call"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="message-list">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-sm animate-fade-in-up">
              <div className="user-avatar w-20 h-20 mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className={`text-xl font-semibold mb-3 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Start a conversation
              </h3>
              <p className={`transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Send a message to {user.username} to get started
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.username === currentUsername;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.username !== message.username);
              
              return (
                <div
                  key={message.id || index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group w-full animate-fade-in`}
                >
                  <div className={`flex items-end gap-3 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for other user */}
                    {!isOwn && (
                      <div className="flex-shrink-0 w-10 h-10">
                        {showAvatar ? (
                          <div className="user-avatar w-10 h-10">
                            <span className="text-white font-semibold text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="w-10 h-10" />
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                      {/* Username for first message */}
                      {!isOwn && showAvatar && (
                        <span className={`text-xs mb-2 px-3 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {user.username}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div className={`message-bubble ${isOwn ? 'message-own' : 'message-other'}`}>
                        <div className="text-sm leading-relaxed">{message.content}</div>
                        
                        {/* Timestamp */}
                        <div className={`text-xs mt-2 ${
                          isOwn 
                            ? 'text-white/70' 
                            : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>

                        {/* Quick Actions on Hover */}
                        <div className={`absolute top-0 ${isOwn ? 'left-0' : 'right-0'} transform ${
                          isOwn ? '-translate-x-full' : 'translate-x-full'
                        } flex items-center gap-1 glass-effect rounded-lg shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10`}>
                          <button
                            onClick={() => handleReply(message)}
                            className={`p-1 rounded transition-colors duration-200 ${
                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                            title="Reply"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className={`w-full border-t px-6 py-3 flex-shrink-0 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="glass-effect rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <span className={`transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Replying to
                </span>
                <span className={`font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {replyingTo.username}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className={`text-lg leading-none transition-colors duration-200 ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-white' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ×
              </button>
            </div>
            <p className={`text-sm truncate transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {replyingTo.content}
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Message Input */}
      <div className={`w-full border-t px-6 py-4 flex-shrink-0 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button
            type="button"
            className={`p-3 rounded-xl transition-all duration-200 hover:scale-105 ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : `Message ${user.username}...`}
              className="chat-input"
              maxLength={500}
              autoComplete="off"
            />
          </div>
          
          <button
            type="submit"
            disabled={!message.trim()}
            className="btn-primary"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Professional Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-effect-strong rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-fade-in-up">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float shadow-xl">
                <Video className="w-10 h-10 text-white" />
              </div>
              
              <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Incoming Video Call
              </h3>
              
              <p className={`mb-8 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <span className="font-medium">{incomingCall.caller_username}</span> wants to start a video call
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => rejectVideoCall(incomingCall.room_id)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg"
                >
                  Decline
                </button>
                <button
                  onClick={() => acceptVideoCall(incomingCall.room_id)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChat;
