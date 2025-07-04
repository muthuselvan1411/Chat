import React, { useState, useEffect } from 'react';
import { ArrowLeft, Video, SkipForward, MessageCircle, Phone, PhoneOff } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../contexts/ThemeContext';
import MessageInput from './MessageInput';
import VideoCall from './VideoCall';

interface StrangerChatProps {
  onBack: () => void;
}

const StrangerChat: React.FC<StrangerChatProps> = ({ onBack }) => {
  const { isDarkMode } = useTheme();
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [hasEnteredStrangerMode, setHasEnteredStrangerMode] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  
  const {
    socket,
    isConnected,
    strangerUser,
    isSearchingStranger,
    strangerPartner,
    strangerMessages,
    strangerRoomId,
    enterStrangerMode,
    findStranger,
    sendStrangerMessage,
    skipStranger,
    inVideoCall,
    incomingCall,
    videoCallRoom,
    videoCallInitiator,
    isVideoCallInitiatorUser,
    startVideoCall,
    acceptVideoCall,
    rejectVideoCall,
    endVideoCall
  } = useSocket('http://localhost:8000');

  // Enhanced debug logging
  useEffect(() => {
    console.log('🎥 StrangerChat state update:', {
      isConnected,
      strangerUser: strangerUser?.username,
      strangerPartner: strangerPartner?.partner_id,
      strangerRoomId,
      inVideoCall,
      videoCallRoom,
      incomingCall: !!incomingCall,
      videoCallInitiator,
      isInitiator: isVideoCallInitiatorUser(),
      socketId: socket?.id,
      setupComplete
    });
  }, [
    isConnected, 
    strangerUser, 
    strangerPartner, 
    strangerRoomId, 
    inVideoCall, 
    videoCallRoom,
    incomingCall, 
    videoCallInitiator, 
    socket?.id,
    setupComplete
  ]);

  // Auto-enter stranger mode when connected
  useEffect(() => {
    if (isConnected && !strangerUser && !hasEnteredStrangerMode) {
      console.log('🎭 Auto-entering stranger mode...');
      enterStrangerMode();
      setHasEnteredStrangerMode(true);
    }
  }, [isConnected, strangerUser, hasEnteredStrangerMode, enterStrangerMode]);

  // Track setup completion
  useEffect(() => {
    const isSetupComplete = strangerUser && strangerPartner && strangerRoomId;
    setSetupComplete(isSetupComplete);
    
    if (isSetupComplete) {
      console.log('✅ Stranger chat setup complete');
    }
  }, [strangerUser, strangerPartner, strangerRoomId]);

  // Log stranger messages for debugging
  useEffect(() => {
    console.log('💬 Stranger messages updated:', strangerMessages.length);
  }, [strangerMessages]);

  const handleFindStranger = () => {
    console.log('🔍 Finding stranger with interests:', interests);
    findStranger(interests);
  };

  const handleSkipStranger = () => {
    console.log('⏭️ Skipping stranger...');
    skipStranger(interests);
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      const trimmedInterest = newInterest.trim();
      console.log('➕ Adding interest:', trimmedInterest);
      setInterests([...interests, trimmedInterest]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    console.log('➖ Removing interest:', interest);
    setInterests(interests.filter(i => i !== interest));
  };

  const handleSendMessage = (content: string) => {
    if (!strangerPartner) {
      console.error('❌ Cannot send message: No stranger partner');
      return;
    }
    console.log('📤 Sending message to stranger:', content);
    sendStrangerMessage(content);
  };

  const debugBackendConnection = async () => {
    try {
      const response = await fetch(`http://localhost:8000/debug/user/${socket?.id}`);
      const data = await response.json();
      console.log('🔍 Backend user state:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to check backend state:', error);
      return null;
    }
  };

  const handleStartVideoCall = async () => {
    console.log('🎥 Attempting to start video call...');
    
    // Step 1: Validate stranger mode
    if (!strangerUser) {
      console.error('❌ Not in stranger mode');
      alert('Please enter stranger mode first!');
      return;
    }
    
    // Step 2: Validate stranger connection
    if (!strangerPartner || !strangerRoomId) {
      console.error('❌ No stranger connected');
      alert('No stranger connected! Please find a stranger first.');
      
      // Auto-redirect to find stranger
      if (!isSearchingStranger) {
        console.log('🔍 Auto-starting stranger search...');
        findStranger([]);
      }
      return;
    }
    
    // Step 3: Validate backend connection
    const backendState = await debugBackendConnection();
    
    if (!backendState?.in_stranger_connections) {
      console.error('❌ Backend shows no stranger connection');
      alert('Connection lost with backend. Please reconnect to stranger.');
      
      // Force reconnection
      skipStranger([]);
      setTimeout(() => findStranger([]), 1000);
      return;
    }
    
    console.log('📞 All validations passed - starting video call...');
    startVideoCall();
  };

  const handleAcceptVideoCall = (roomId: string) => {
    console.log('✅ Accepting video call for room:', roomId);
    
    if (!strangerPartner) {
      console.error('❌ Cannot accept call: No stranger partner');
      return;
    }

    acceptVideoCall(roomId);
  };

  const handleRejectVideoCall = (roomId: string) => {
    console.log('❌ Rejecting video call for room:', roomId);
    rejectVideoCall(roomId);
  };

  const handleEndVideoCall = () => {
    console.log('📞 Ending video call...');
    endVideoCall();
  };

  // Validate stranger connection before rendering VideoCall
  const canRenderVideoCall = () => {
    const hasValidConnection = !!(strangerPartner && (strangerRoomId || videoCallRoom));
    console.log('🔍 Can render video call:', {
      inVideoCall,
      strangerPartner: !!strangerPartner,
      strangerRoomId: !!strangerRoomId,
      videoCallRoom: !!videoCallRoom,
      hasValidConnection
    });
    return inVideoCall && hasValidConnection;
  };

  // Render VideoCall component when conditions are met
  if (canRenderVideoCall()) {
    const roomId = videoCallRoom || strangerRoomId;
    const isInitiator = isVideoCallInitiatorUser();
    const partnerName = strangerPartner?.username || 'Stranger';
    
    console.log('🎥 Rendering VideoCall component:', {
      roomId,
      isInitiator,
      partnerName,
      strangerPartner,
      strangerRoomId,
      socketId: socket?.id 
    });
    
    return (
      <VideoCall
        roomId={roomId!}
        isInitiator={isInitiator}
        onEndCall={handleEndVideoCall}
        onBack={onBack}
        partnerName={partnerName}
        strangerPartner={strangerPartner}
        strangerRoomId={strangerRoomId|| undefined}
        socket={socket}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Stranger Chat
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {strangerUser?.username || 'Loading...'}
              </p>
              {/* Debug info */}
              {strangerPartner && (
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  Connected: {strangerPartner.partner_id?.slice(0, 8)}... | Room: {strangerRoomId?.slice(-8)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {strangerPartner && strangerRoomId ? (
              <>
                <button
                  onClick={handleStartVideoCall}
                  disabled={inVideoCall || !setupComplete}
                  className="p-2 rounded-xl bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Start video call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSkipStranger}
                  disabled={inVideoCall}
                  className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Skip stranger"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!strangerUser) {
                    alert('Please wait for stranger mode to initialize...');
                  } else if (isSearchingStranger) {
                    alert('Currently searching for stranger...');
                  } else {
                    findStranger([]);
                  }
                }}
                disabled={isSearchingStranger}
                className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors duration-200 disabled:opacity-50"
                title="Find stranger first"
              >
                {isSearchingStranger ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Bar */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-blue-700 dark:text-blue-300">
              {isConnected ? 'Connected to server' : 'Disconnected from server'}
            </span>
          </div>
          {strangerPartner && (
            <span className="text-green-700 dark:text-green-300 font-medium">
              ✅ Stranger connected
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          {!strangerPartner && !isSearchingStranger ? (
            // Initial State
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Ready to Meet Strangers?
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  Click "Find Stranger" to be matched with someone random from around the world
                </p>

                {/* Interests */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Add interests to find like-minded people (optional)
                  </h3>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                      placeholder="e.g., music, gaming, art"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleAddInterest}
                      disabled={!newInterest.trim()}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                        >
                          {interest}
                          <button
                            onClick={() => handleRemoveInterest(interest)}
                            className="ml-1 text-purple-500 hover:text-purple-700 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleFindStranger}
                  disabled={!isConnected || !strangerUser}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {!isConnected ? 'Connecting...' : !strangerUser ? 'Setting up...' : 'Find Stranger'}
                </button>
              </div>
            </div>
          ) : isSearchingStranger ? (
            // Searching State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Looking for a stranger...
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  This may take a few moments
                </p>
                {interests.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Searching with interests:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Cancel search button */}
                <button
                  onClick={handleSkipStranger}
                  className="mt-6 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  Cancel search
                </button>
              </div>
            </div>
          ) : (
            // Chat State
            <>
              {/* Chat Header */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {strangerPartner?.username?.charAt(0) || 'S'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Connected to Stranger
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Online • Ready to chat
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Say hello! 👋
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {strangerMessages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Start the conversation!</p>
                    <p className="text-xs mt-2">
                      You can also start a video call using the camera button above
                    </p>
                  </div>
                ) : (
                  strangerMessages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${
                        message.userId === socket?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words ${
                          message.userId === socket?.id
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.userId === socket?.id
                            ? 'text-purple-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4">
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTyping={() => {}}
                  placeholder="Type a message to the stranger..."
                  isDarkMode={isDarkMode}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Phone className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Incoming Video Call
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Stranger wants to start a video call
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => handleRejectVideoCall(incomingCall.room_id)}
                  className="flex-1 bg-red-500 text-white py-3 px-4 rounded-xl hover:bg-red-600 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  Decline
                </button>
                <button
                  onClick={() => handleAcceptVideoCall(incomingCall.room_id)}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
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

export default StrangerChat;
