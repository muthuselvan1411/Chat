import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Users, Hash, Moon, Sun, ArrowLeft, MessageSquare, Bug, Menu, X, 
  Wifi, WifiOff, Settings, Search, Filter, MoreVertical, Bell, BellOff,
  Shield, Crown, Star, Zap
} from 'lucide-react';
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
  onBack: () => void;
}

interface ConnectionStats {
  latency: number;
  reconnectCount: number;
  lastReconnect: Date | null;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ username, roomId, onBack }) => {
  const { 
    socket,
    socketRef,
    isConnected, 
    messages, 
    privateMessages,
    users, 
    hasJoined, 
    privateConversations,
    messageReactions,
    joinRoom, 
    sendMessage, 
    sendPrivateMessage,
    endPrivateChat,
    addReaction,
    removeReaction,
    sendReply
  } = useSocket('http://localhost:8000');
  
  const { isDarkMode, toggleTheme } = useTheme();

  // UI State
  const [showPrivateChats, setShowPrivateChats] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [notifications, setNotifications] = useState(true);

  // Chat State
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    username: string;
    content: string;
  } | null>(null);
  const [isInPrivateChat, setIsInPrivateChat] = useState(false);
  const [privateChatUserId, setPrivateChatUserId] = useState<string | null>(null);

  // Performance & Analytics
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    latency: 0,
    reconnectCount: 0,
    lastReconnect: null
  });
  const [messageCount, setMessageCount] = useState(0);

  // Auto-join room when connected
  useEffect(() => {
    if (isConnected && !hasJoined && username && roomId) {
      joinRoom(username, roomId);
    }
  }, [isConnected, hasJoined, username, roomId, joinRoom]);

  // Connection monitoring
  useEffect(() => {
    if (!socket) return;

    const pingInterval = setInterval(() => {
      const start = Date.now();
      socket.emit('ping', start);
    }, 30000);

    const handlePong = (timestamp: number) => {
      const latency = Date.now() - timestamp;
      setConnectionStats(prev => ({ ...prev, latency }));
    };

    const handleReconnect = () => {
      setConnectionStats(prev => ({
        ...prev,
        reconnectCount: prev.reconnectCount + 1,
        lastReconnect: new Date()
      }));
    };

    socket.on('pong', handlePong);
    socket.on('reconnect', handleReconnect);

    return () => {
      clearInterval(pingInterval);
      socket.off('pong', handlePong);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket]);

  // Typing indicator management
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: any) => {
      if (data.isPrivate) return; // Handle in PrivateChat component
      
      if (data.room === roomId) {
        if (data.typing) {
          setTypingUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
      }
    };

    socket.on('user_typing', handleUserTyping);
    return () => socket.off('user_typing', handleUserTyping);
  }, [socket, roomId]);

  // Message count tracking
  useEffect(() => {
    setMessageCount(messages.length);
  }, [messages.length]);

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (userFilter !== 'all') {
      filtered = filtered.filter(user => 
        userFilter === 'online' ? user.isOnline : !user.isOnline
      );
    }
    
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [users, userFilter, searchQuery]);

  // Memoized unread count
  const totalUnreadCount = useMemo(() => 
    privateConversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
    [privateConversations]
  );

  // Event handlers
  const handleReply = useCallback((messageId: string, username: string, content: string) => {
    setReplyingTo({ messageId, username, content });
  }, []);

 const handleSendMessage = useCallback((content: string, fileInfo?: any) => {
  console.log('📤 ChatRoom handleSendMessage called with:', { content, fileInfo });
  
  if (replyingTo) {
    console.log('📤 Sending reply message');
    sendReply(replyingTo.messageId, replyingTo.username, replyingTo.content, content);
    setReplyingTo(null);
  } else if (isInPrivateChat && privateChatUserId) {
    console.log('🔒 Sending private message via ChatRoom:', content, 'to:', privateChatUserId);
    sendPrivateMessage(content, privateChatUserId);
  } else {
    console.log('📤 ChatRoom sending message:', content, 'fileInfo:', fileInfo);
    console.log('📤 ChatRoom calling sendMessage with roomId:', roomId);
    sendMessage(content, roomId, fileInfo); // Pass fileInfo to sendMessage
  }
}, [replyingTo, isInPrivateChat, privateChatUserId, sendReply, sendPrivateMessage, sendMessage, roomId]);



  const handleTyping = useCallback((isTyping: boolean) => {
    if (isInPrivateChat && privateChatUserId) {
      socket?.emit(isTyping ? 'typing_start' : 'typing_stop', {
        isPrivate: true,
        targetUserId: privateChatUserId
      });
    } else {
      socket?.emit(isTyping ? 'typing_start' : 'typing_stop', {
        isPrivate: false,
        room: roomId
      });
    }
  }, [isInPrivateChat, privateChatUserId, socket, roomId]);

  const handleUserClick = useCallback((user: any) => {
    if (user.username !== username) {
      setIsInPrivateChat(true);
      setPrivateChatUserId(user.id);
      setShowPrivateChats(false);
      setSidebarOpen(false);
    }
  }, [username]);

  const handleBackToRoom = useCallback(() => {
    setIsInPrivateChat(false);
    setPrivateChatUserId(null);
    endPrivateChat();
  }, [endPrivateChat]);

  const getCurrentUser = useCallback(() => {
    if (!privateChatUserId) return null;
    return users.find(user => user.id === privateChatUserId) || 
           { id: privateChatUserId, username: 'Unknown', isOnline: false };
  }, [privateChatUserId, users]);

  const getCurrentMessages = useCallback(() => {
    if (isInPrivateChat && privateChatUserId) {
      return privateMessages.filter(msg => 
        (msg.fromId === privateChatUserId || msg.toId === privateChatUserId)
      );
    }
    return messages;
  }, [isInPrivateChat, privateChatUserId, privateMessages, messages]);

  const debugPrivateMessage = useCallback(() => {
    console.group('🧪 Debug: Private Message System');
    console.log('Socket state:', socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Socket ID:', socket?.id);
    console.log('Is connected state:', isConnected);
    console.log('Has joined:', hasJoined);
    console.log('Users available:', users);
    console.log('Private conversations:', privateConversations);
    console.log('Private messages:', privateMessages);
    console.groupEnd();
    
    if (!socket) {
      console.error('❌ Socket is null/undefined');
      return;
    }
    
    if (users.length > 1) {
      const otherUser = users.find(user => user.username !== username);
      if (otherUser) {
        const testPayload = {
          message: `Debug test message at ${new Date().toLocaleTimeString()}`,
          to: otherUser.id
        };
        socket.emit('private_message', testPayload);
        sendPrivateMessage('Test via hook function', otherUser.id);
      }
    }
  }, [socket, isConnected, hasJoined, users, privateConversations, privateMessages, username, sendPrivateMessage]);

  // Get current data
  const currentUser = getCurrentUser();
  const currentMessages = getCurrentMessages();

  // Loading state
  if (!hasJoined) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-all duration-500">
        <div className="text-center animate-fade-in-up">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center animate-float shadow-2xl">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 rounded-2xl animate-spin border-t-transparent opacity-60"></div>
            <div className="absolute -inset-2 w-24 h-24 border-2 border-purple-400 rounded-2xl animate-pulse opacity-30"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {isConnected ? `Joining ${roomId}` : 'Connecting to server'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            {isConnected ? 'Setting up your chat experience...' : 'Establishing secure connection...'}
          </p>
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Private chat mode
  if (isInPrivateChat && currentUser) {
    return (
      <div className="h-screen flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-500">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-all duration-300 ease-out z-50`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-gray-900 dark:text-white text-lg truncate">
                  #{roomId}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {messageCount} messages • {users.length} online
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 group"
                title="Back to room selection"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-200" />
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 group"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:rotate-90 transition-transform duration-200" />
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 group"
                title="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-yellow-500 group-hover:rotate-180 transition-transform duration-300" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600 group-hover:rotate-12 transition-transform duration-300" />
                )}
              </button>
              
              <button
                onClick={() => setShowPrivateChats(!showPrivateChats)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 relative group"
                title="Private chats"
              >
                <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-200" />
                {totalUnreadCount > 0 && (
                  <div className="notification-badge animate-bounce">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </div>
                )}
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 md:hidden group"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>
          
          {/* Enhanced Connection Status */}
          <div className="glass-effect rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Wifi className="w-4 h-4 text-green-500" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    <span className="font-medium text-green-600 dark:text-green-400 text-sm">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="font-medium text-red-600 dark:text-red-400 text-sm">Disconnected</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {connectionStats.latency > 0 && `${connectionStats.latency}ms`}
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <span className="font-medium">{username}</span>
              {connectionStats.reconnectCount > 0 && (
                <span className="ml-2 text-orange-500">• {connectionStats.reconnectCount} reconnects</span>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="glass-effect rounded-xl p-4 mb-4 animate-fade-in-down">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Notifications</span>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`p-1 rounded-lg transition-colors duration-200 ${
                      notifications ? 'text-green-500' : 'text-gray-400'
                    }`}
                  >
                    {notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Debug Mode</span>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className={`p-1 rounded-lg transition-colors duration-200 ${
                      showDebug ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Debug Panel */}
          {showDebug && (
            <div className="glass-effect rounded-xl p-4 mb-4 animate-fade-in-down border-l-4 border-red-500">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Debug Panel
              </h4>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-red-700 dark:text-red-300">
                  <div className="space-y-1">
                    <div>Socket ID: <span className="font-mono text-xs">{socket?.id?.slice(-8) || 'None'}</span></div>
                    <div>Connected: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>{isConnected ? 'Yes' : 'No'}</span></div>
                    <div>Joined: <span className={hasJoined ? 'text-green-600' : 'text-red-600'}>{hasJoined ? 'Yes' : 'No'}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div>Users: <span className="font-semibold">{users.length}</span></div>
                    <div>Messages: <span className="font-semibold">{messageCount}</span></div>
                    <div>Private: <span className="font-semibold">{privateMessages.length}</span></div>
                  </div>
                </div>
                <button
                  onClick={debugPrivateMessage}
                  className="w-full mt-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 transform hover:scale-105"
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
                  Private Chats
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                    {privateConversations.length}
                  </span>
                </h3>
                <button
                  onClick={() => setShowPrivateChats(false)}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium hover:underline transition-all duration-200"
                >
                  Show Users
                </button>
              </div>
              <div className="space-y-2">
                {privateConversations.map((conv, index) => (
                  <div
                    key={conv.userId}
                    onClick={() => {
                      setIsInPrivateChat(true);
                      setPrivateChatUserId(conv.userId);
                      setShowPrivateChats(false);
                    }}
                    className={`user-list-item cursor-pointer group ${
                      privateChatUserId === conv.userId ? 'selected' : ''
                    }`}
                    style={{animationDelay: `${index * 0.05}s`}}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {conv.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {conv.username}
                        </span>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="notification-badge">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate pl-10">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                ))}
                {privateConversations.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-16 animate-fade-in-up">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-sm font-medium mb-1">No private chats yet</p>
                    <p className="text-xs">Click on a user to start chatting privately</p>
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
                    Online Users
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                    {filteredUsers.length}
                  </span>
                </div>
                {privateConversations.length > 0 && (
                  <button
                    onClick={() => setShowPrivateChats(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium hover:underline transition-all duration-200"
                  >
                    Show Chats
                  </button>
                )}
              </div>

              {/* User Search and Filter */}
              <div className="mb-4 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'online', 'offline'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setUserFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                        userFilter === filter
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/50'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <UserList 
                users={filteredUsers} 
                currentUsername={username}
                onUserClick={handleUserClick}
                selectedUser={currentUser}
                onPrivateMessage={handleUserClick}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Main Chat Area */}
      <div className="chat-main">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 group"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <div className="text-center">
            <h1 className="font-semibold text-gray-900 dark:text-white">#{roomId}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{users.length} online</p>
          </div>
          <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200">
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Enhanced Desktop Chat Header */}
        <div className="hidden md:block chat-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize truncate flex items-center gap-2">
                  {roomId}
                  <Zap className="w-5 h-5 text-yellow-500" />
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{users.length} members online</span>
                  <span>•</span>
                  <span>{messageCount} messages</span>
                  {connectionStats.latency > 0 && (
                    <>
                      <span>•</span>
                      <span className={`${connectionStats.latency < 100 ? 'text-green-500' : connectionStats.latency < 300 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {connectionStats.latency}ms
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200">
                <Search className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200">
                <Filter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200">
                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
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
        
        {/* Enhanced Message Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4">
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
