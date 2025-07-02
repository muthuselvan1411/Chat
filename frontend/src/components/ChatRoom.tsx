import React, { useEffect, useState } from 'react';
import { Users, Hash, Moon, Sun, ArrowLeft, MessageSquare, Bug, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../contexts/ThemeContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import TypingIndicator from './TypingIndicator';
import PrivateChat from './PrivateChat';

interface ChatRoomProps {
  username: string;
  roomId: string;
  onBack: () => void; // Add this prop
}

const ChatRoom: React.FC<ChatRoomProps> = ({ username, roomId, onBack }) => {
  const { 
    socket,
    socketRef,
    isConnected, 
    messages, 
    privateMessages, // Add this
    users, 
    hasJoined, 
    privateConversations,
    currentPrivateChat,
    messageReactions,
    joinRoom, 
    sendMessage, 
    sendPrivateMessage,
    setTyping,
    startPrivateChat,
    endPrivateChat,
    getCurrentPrivateMessages,
    addReaction,
    removeReaction,
    sendReply
  } = useSocket('http://localhost:8000');
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrivateChats, setShowPrivateChats] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    username: string;
    content: string;
  } | null>(null);

  // Add state for private chat mode
  const [isInPrivateChat, setIsInPrivateChat] = useState(false);
  const [privateChatUserId, setPrivateChatUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && !hasJoined && username && roomId) {
      joinRoom(username, roomId);
    }
  }, [isConnected, hasJoined, username, roomId, joinRoom]);

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: any) => {
      console.log('👀 Typing event received in ChatRoom:', data);
      
      if (data.isPrivate) {
        // Handle private chat typing - this will be handled in PrivateChat component
        return;
      }
      
      // Handle room typing
      if (data.room === roomId) {
        if (data.typing) {
          setTypingUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
      }
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, roomId]);

  const handleReply = (messageId: string, username: string, content: string) => {
    setReplyingTo({ messageId, username, content });
  };

  const handleSendMessage = (content: string) => {
    if (replyingTo) {
      sendReply(replyingTo.messageId, replyingTo.username, replyingTo.content, content);
      setReplyingTo(null);
    } else if (isInPrivateChat && privateChatUserId) {
      console.log('🔒 Sending private message via ChatRoom:', content, 'to:', privateChatUserId);
      sendPrivateMessage(content, privateChatUserId);
    } else {
      sendMessage(content, roomId);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (isInPrivateChat && privateChatUserId) {
      // Handle private chat typing
      if (isTyping) {
        socket?.emit('typing_start', {
          isPrivate: true,
          targetUserId: privateChatUserId
        });
      } else {
        socket?.emit('typing_stop', {
          isPrivate: true,
          targetUserId: privateChatUserId
        });
      }
    } else {
      // Handle room typing
      if (isTyping) {
        socket?.emit('typing_start', {
          isPrivate: false,
          room: roomId
        });
      } else {
        socket?.emit('typing_stop', {
          isPrivate: false,
          room: roomId
        });
      }
    }
  };

  const handleUserClick = (user: any) => {
    if (user.username !== username) {
      console.log('👤 Starting private chat with user:', user.username, 'ID:', user.id);
      setIsInPrivateChat(true);
      setPrivateChatUserId(user.id);
      setShowPrivateChats(false);
      setSidebarOpen(false);
    }
  };

  const handleBackToRoom = () => {
    console.log('🔙 Returning to main room');
    setIsInPrivateChat(false);
    setPrivateChatUserId(null);
    endPrivateChat();
  };

  const getCurrentUser = () => {
    if (!privateChatUserId) return null;
    return users.find(user => user.id === privateChatUserId) || 
           { id: privateChatUserId, username: 'Unknown', isOnline: false };
  };

  const debugPrivateMessage = () => {
    console.log('🧪 Debug: Testing private message');
    console.log('🧪 Socket state:', socket);
    console.log('🧪 Socket ref:', socketRef);
    console.log('🧪 Socket connected:', socket?.connected);
    console.log('🧪 Socket ID:', socket?.id);
    console.log('🧪 Is connected state:', isConnected);
    console.log('🧪 Has joined:', hasJoined);
    console.log('🧪 Users available:', users);
    
    if (!socket) {
      console.error('❌ Socket is null/undefined - this is the problem!');
      return;
    }
    
    if (users.length > 1) {
      const otherUser = users.find(user => user.username !== username);
      if (otherUser) {
        console.log('🧪 Sending test message to:', otherUser.username, 'ID:', otherUser.id);
        
        const testPayload = {
          message: 'Test private message from debug button',
          to: otherUser.id
        };
        console.log('🧪 Direct socket emit with payload:', testPayload);
        socket.emit('private_message', testPayload);
        console.log('🧪 Message sent via socket.emit');
        
        console.log('🧪 Testing via hook function');
        sendPrivateMessage('Test via hook function', otherUser.id);
      } else {
        console.log('❌ No other users found');
      }
    } else {
      console.log('❌ Need at least 2 users for private messaging');
    }
  };

  // Get current messages based on mode
  const getCurrentMessages = () => {
    if (isInPrivateChat && privateChatUserId) {
      return privateMessages.filter(msg => 
        (msg.fromId === privateChatUserId || msg.toId === privateChatUserId)
      );
    }
    return messages;
  };

  const currentUser = getCurrentUser();
  const currentMessages = getCurrentMessages();

  if (!hasJoined) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center animate-fade-in-up">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300 text-lg">
            {isConnected ? `Joining ${roomId}...` : 'Connecting to server...'}
          </p>
        </div>
      </div>
    );
  }

  // Render PrivateChat component if in private chat mode
  if (isInPrivateChat && currentUser) {
    return (
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <PrivateChat
          user={currentUser}
          messages={currentMessages}
          currentUsername={username}
          onSendMessage={(content) => {
            if (privateChatUserId) {
              sendPrivateMessage(content, privateChatUserId);
            }
          }}
          onTyping={handleTyping}
          onBack={handleBackToRoom}
        />
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-50`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Hash className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <h2 className="font-bold text-gray-900 dark:text-white text-lg truncate">
                #{roomId}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Back Button */}
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 transform hover:scale-105"
                title="Back to room selection"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>

              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 transition-all duration-200 transform hover:scale-105"
                title="Debug Private Messages"
              >
                <Bug className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
              
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 transform hover:scale-105"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
              </button>
              
              <button
                onClick={() => setShowPrivateChats(!showPrivateChats)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 transform hover:scale-105 relative"
              >
                <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                {privateConversations.some(conv => conv.unreadCount > 0) && (
                  <div className="notification-badge">
                    {privateConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)}
                  </div>
                )}
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 md:hidden"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={`font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              as {username}
            </div>
          </div>

          {/* Debug Panel */}
          {showDebug && (
            <div className="mt-4 p-4 glass-effect rounded-xl animate-fade-in-down">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Debug Panel
              </h4>
              <div className="space-y-2 text-xs text-red-700 dark:text-red-300">
                <div className="flex justify-between">
                  <span>Socket ID:</span>
                  <span className="font-mono">{socket?.id || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connected:</span>
                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                    {isConnected ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Joined:</span>
                  <span className={hasJoined ? 'text-green-600' : 'text-red-600'}>
                    {hasJoined ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Users:</span>
                  <span>{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Private Chats:</span>
                  <span>{privateConversations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Private Messages:</span>
                  <span>{privateMessages.length}</span>
                </div>
                <button
                  onClick={debugPrivateMessage}
                  className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200"
                >
                  Test Private Message
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {showPrivateChats ? (
            <div className="p-4 h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Private Chats ({privateConversations.length})
                </h3>
                <button
                  onClick={() => setShowPrivateChats(false)}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  Show Users
                </button>
              </div>
              <div className="space-y-3">
                {privateConversations.map((conv, index) => (
                  <div
                    key={conv.userId}
                    onClick={() => {
                      setIsInPrivateChat(true);
                      setPrivateChatUserId(conv.userId);
                      setShowPrivateChats(false);
                    }}
                    className={`user-list-item ${
                      privateChatUserId === conv.userId ? 'selected' : ''
                    }`}
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {conv.username}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="notification-badge">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                ))}
                {privateConversations.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-12 animate-fade-in-up">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No private chats yet</p>
                    <p className="text-xs mt-1">Click on a user to start chatting</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Online Users ({users.length})
                  </span>
                </div>
                {privateConversations.length > 0 && (
                  <button
                    onClick={() => setShowPrivateChats(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Show Chats
                  </button>
                )}
              </div>
              <UserList 
                users={users} 
                currentUsername={username}
                onUserClick={handleUserClick}
                selectedUser={currentUser}
                onPrivateMessage={handleUserClick} // Add this prop
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="font-semibold text-gray-900 dark:text-white">
            #{roomId}
          </h1>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Desktop Chat Header */}
        <div className="hidden md:block chat-header">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Hash className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize truncate">
                {roomId}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {users.length} members online
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="message-list">
          <MessageList 
            messages={currentMessages} 
            currentUsername={username}
            isPrivateChat={false}
            messageReactions={messageReactions}
            onAddReaction={addReaction}
            onRemoveReaction={removeReaction}
            onReply={handleReply}
            currentRoom={roomId}
            isDarkMode={isDarkMode}
          />
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
        </div>
        
        {/* Message Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4">
          <MessageInput 
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            placeholder={
              replyingTo 
                ? `Replying to ${replyingTo.username}...`
                : `Message #${roomId}`
            }
            isDarkMode={isDarkMode}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
