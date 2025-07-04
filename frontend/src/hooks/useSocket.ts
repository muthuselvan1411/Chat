import { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Message, User, PrivateConversation, Reaction } from '../types';

export const useSocket = (serverUrl: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Regular chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation[]>([]);
  const [currentPrivateChat, setCurrentPrivateChat] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<{ [messageId: string]: Reaction[] }>({});
  
  // Stranger chat state
  const [chatMode, setChatMode] = useState<'regular' | 'stranger'>('regular');
  const [strangerUser, setStrangerUser] = useState<any>(null);
  const [isSearchingStranger, setIsSearchingStranger] = useState(false);
  const [strangerPartner, setStrangerPartner] = useState<any>(null);
  const [strangerMessages, setStrangerMessages] = useState<Message[]>([]);
  const [strangerRoomId, setStrangerRoomId] = useState<string | null>(null);
  
  // Video call state
  const [inVideoCall, setInVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [videoCallRoom, setVideoCallRoom] = useState<string | null>(null);
  const [videoCallInitiator, setVideoCallInitiator] = useState<string | null>(null);
  
  const joinedRef = useRef(false);
  const currentRoomRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log('🔌 Creating socket connection to:', serverUrl);
    
    // Determine the correct socket URL based on current location
   const socketUrl = process.env.NODE_ENV === 'production' 
  ? 'https://chat-fres.vercel.app'  // Your actual backend URL
  : 'https://mumegle.up.railway.app';

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      withCredentials: true
    });
    
    setSocket(newSocket);
    socketRef.current = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to server with ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
      setHasJoined(false);
      joinedRef.current = false;
      setInVideoCall(false);
      setIncomingCall(null);
      setVideoCallRoom(null);
    });

    // Connection options
    newSocket.on('connection_options', (data) => {
      console.log('📋 Connection options received:', data);
    });

    // Regular chat events
    newSocket.on('join_success', (data) => {
      console.log('✅ Successfully joined room:', data.room);
      setHasJoined(true);
      joinedRef.current = true;
      currentRoomRef.current = data.room;
    });

    newSocket.on('message', (message: Message) => {
      console.log('📨 Received public message:', message);
      setMessages(prev => [...prev, message]);
    });

    // **NEW: Message editing/deletion event listeners**
    newSocket.on('message_edited', (data: any) => {
      console.log('✏️ Message edited:', data);
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { 
              ...msg, 
              content: data.new_content, 
              edited: true, 
              edited_at: data.edited_at 
            }
          : msg
      ));
      
      // Also update stranger messages if in stranger mode
      setStrangerMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { 
              ...msg, 
              content: data.new_content, 
              edited: true, 
              edited_at: data.edited_at 
            }
          : msg
      ));
    });

    newSocket.on('message_deleted', (data: any) => {
      console.log('🗑️ Message deleted:', data);
      setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      
      // Also update stranger messages if in stranger mode
      setStrangerMessages(prev => prev.filter(msg => msg.id !== data.message_id));
    });

    newSocket.on('private_message', (message: Message) => {
      console.log('🔒 Received private message:', message);
      setPrivateMessages(prev => [...prev, message]);
      
      setPrivateConversations(prev => {
        const otherUserId = message.fromSelf ? message.toId : message.fromId;
        const otherUsername = message.fromSelf ? message.to : message.from;
        
        if (!otherUserId || !otherUsername) return prev;
        
        const existingConv = prev.find(conv => conv.userId === otherUserId);
        
        if (existingConv) {
          return prev.map(conv => 
            conv.userId === otherUserId 
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  lastMessage: message,
                  unreadCount: message.fromSelf ? conv.unreadCount : conv.unreadCount + 1
                }
              : conv
          );
        } else {
          return [...prev, {
            userId: otherUserId,
            username: otherUsername,
            messages: [message],
            lastMessage: message,
            unreadCount: message.fromSelf ? 0 : 1
          }];
        }
      });
    });

    // Stranger chat events
    newSocket.on('stranger_mode_entered', (data) => {
      console.log('🎭 Entered stranger mode:', data);
      setStrangerUser(data);
      setChatMode('stranger');
    });

    newSocket.on('searching_stranger', (data) => {
      console.log('🔍 Searching for stranger:', data);
      setIsSearchingStranger(true);
    });

    newSocket.on('stranger_found', (data) => {
      console.log('👥 Stranger found:', data);
      setIsSearchingStranger(false);
      setStrangerPartner(data);
      setStrangerRoomId(data.room_id);
      setStrangerMessages([]);
    });

    newSocket.on('stranger_message', (message) => {
      console.log('💬 Stranger message received:', message);
      setStrangerMessages(prev => [...prev, message]);
    });

    newSocket.on('stranger_disconnected', (data) => {
      console.log('❌ Stranger disconnected:', data);
      setStrangerPartner(null);
      setStrangerRoomId(null);
      setIsSearchingStranger(false);
      setInVideoCall(false);
      setVideoCallRoom(null);
    });

    // Video call events
    newSocket.on('video_call_initiated', (data) => {
      console.log('📞 Video call initiated:', data);
      setVideoCallRoom(data.room_id);
      setVideoCallInitiator(data.initiator || newSocket.id);
    });

    newSocket.on('incoming_video_call', (data) => {
      console.log('📞 Incoming video call:', data);
      setIncomingCall(data);
      setVideoCallInitiator(data.caller_id);
    });

    newSocket.on('video_call_accepted', (data) => {
      console.log('✅ Video call accepted:', data);
      setInVideoCall(true);
      setVideoCallRoom(data.room_id);
      setIncomingCall(null);
    });

    newSocket.on('video_call_rejected', (data) => {
      console.log('❌ Video call rejected:', data);
      setIncomingCall(null);
      setVideoCallRoom(null);
      setVideoCallInitiator(null);
    });

    newSocket.on('video_call_ended', (data) => {
      console.log('📞 Video call ended:', data);
      setInVideoCall(false);
      setVideoCallRoom(null);
      setVideoCallInitiator(null);
    });

    // WebRTC Signaling Events
    newSocket.on('user_joined', (data) => {
      console.log('👤 User joined video call room:', data);
    });

    newSocket.on('webrtc_offer', (data) => {
      console.log('📡 WebRTC offer received:', data);
    });

    newSocket.on('webrtc_answer', (data) => {
      console.log('📡 WebRTC answer received:', data);
    });

    newSocket.on('webrtc_ice_candidate', (data) => {
      console.log('🧊 WebRTC ICE candidate received:', data);
    });

    newSocket.on('call_ended', (data) => {
      console.log('📞 WebRTC call ended:', data);
      setInVideoCall(false);
      setVideoCallRoom(null);
    });

    // Reaction events
    newSocket.on('reaction_updated', (data) => {
      console.log('🎭 Reaction updated:', data);
      setMessageReactions(prev => ({
        ...prev,
        [data.messageId]: data.reactions
      }));
    });

    // User list events
    newSocket.on('room_users', (data) => {
      console.log('👥 Updated user list:', data.users);
      setUsers(data.users || []);
    });

    newSocket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
    });

    return () => {
      console.log('🔌 Disconnecting socket');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [serverUrl]);

  // Regular chat functions
  const joinRoom = useCallback((username: string, roomId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !isConnected || joinedRef.current) {
      return;
    }

    console.log('🚪 Joining room:', roomId, 'as', username);
    currentSocket.emit('join_room', { username, roomId });
  }, [socket, isConnected]);

  const sendMessage = useCallback((content: string, roomId: string, fileInfo?: any) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !hasJoined) {
      console.log('❌ SendMessage blocked:', { 
        hasSocket: !!currentSocket, 
        hasJoined
      });
      return;
    }

    // FIXED: Allow empty content if we have fileInfo
    if (!content.trim() && !fileInfo) {
      console.log('❌ SendMessage blocked: No content and no file');
      return;
    }

    const messageData: any = {
      message: content,
      room: roomId
    };

    // Add file info if provided
    if (fileInfo) {
      messageData.fileInfo = fileInfo;
      console.log('📎 Sending file message with data:', fileInfo);
    }

    console.log('📤 useSocket sending message data to backend:', messageData);
    currentSocket.emit('send_message', messageData);
  }, [socket, hasJoined]);

  // **NEW: Message editing/deletion functions**
  const editMessage = useCallback((messageId: string, newContent: string, room: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !hasJoined) {
      console.log('❌ EditMessage blocked:', { 
        hasSocket: !!currentSocket, 
        hasJoined
      });
      return;
    }

    if (!messageId || !newContent.trim()) {
      console.log('❌ EditMessage blocked: Invalid messageId or content');
      return;
    }

    console.log('✏️ Editing message:', messageId, newContent);
    currentSocket.emit('edit_message', {
      message_id: messageId,
      new_content: newContent.trim(),
      room: room
    });
  }, [socket, hasJoined]);
// Fix the deleteMessage function
const deleteMessage = useCallback((messageId: string, room: string) => {
  const currentSocket = socketRef.current || socket;
  
  console.log('🗑️ DeleteMessage called:', { messageId, room, hasSocket: !!currentSocket, hasJoined });
  
  if (!currentSocket) {
    console.log('❌ DeleteMessage blocked: No socket connection');
    return;
  }

  if (!hasJoined) {
    console.log('❌ DeleteMessage blocked: Not joined to room');
    return;
  }

  if (!messageId) {
    console.log('❌ DeleteMessage blocked: Invalid messageId');
    return;
  }

  console.log('🗑️ useSocket deleting message:', messageId, 'in room:', room);
  currentSocket.emit('delete_message', {
    message_id: messageId,
    room: room
  });
}, [socket, hasJoined]);


  const sendPrivateMessage = useCallback((content: string, toUserId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !isConnected || !content.trim() || !toUserId) {
      console.error('❌ Cannot send private message:', {
        socket: !!currentSocket,
        connected: isConnected,
        content: !!content.trim(),
        toUserId: !!toUserId
      });
      return;
    }

    console.log('🔒 Sending private message to:', toUserId, 'content:', content);
    
    currentSocket.emit('private_message', {
      message: content,
      to: toUserId
    });
  }, [socket, isConnected]);

  // Stranger chat functions
  const enterStrangerMode = useCallback(() => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !isConnected) {
      return;
    }

    console.log('🎭 Entering stranger mode');
    currentSocket.emit('enter_stranger_mode', {});
  }, [socket, isConnected]);

  const findStranger = useCallback((interests: string[] = []) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !isConnected) {
      return;
    }

    console.log('🔍 Finding stranger with interests:', interests);
    currentSocket.emit('find_stranger', { interests });
  }, [socket, isConnected]);

  const sendStrangerMessage = useCallback((content: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !strangerPartner || !content.trim()) {
      return;
    }

    currentSocket.emit('send_stranger_message', {
      message: content
    });
  }, [socket, strangerPartner]);

  const skipStranger = useCallback((interests: string[] = []) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !isConnected) {
      return;
    }

    console.log('⏭️ Skipping stranger');
    currentSocket.emit('skip_stranger', { interests });
  }, [socket, isConnected]);

  // Video call functions
  const startVideoCall = useCallback(() => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !strangerPartner) {
      return;
    }

    console.log('📞 Starting video call');
    setVideoCallInitiator(currentSocket.id || '');
    currentSocket.emit('start_video_call', {});
  }, [socket, strangerPartner]);

  const acceptVideoCall = useCallback((roomId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket) {
      return;
    }

    console.log('✅ Accepting video call');
    currentSocket.emit('accept_video_call', { room_id: roomId });
  }, [socket]);

  const rejectVideoCall = useCallback((roomId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket) {
      return;
    }

    console.log('❌ Rejecting video call');
    currentSocket.emit('reject_video_call', { room_id: roomId });
    setIncomingCall(null);
  }, [socket]);

  const endVideoCall = useCallback(() => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket || !videoCallRoom) {
      return;
    }

    console.log('📞 Ending video call');
    currentSocket.emit('end_video_call', { room_id: videoCallRoom });
    setInVideoCall(false);
    setVideoCallRoom(null);
    setVideoCallInitiator(null);
  }, [socket, videoCallRoom]);

  // WebRTC Signaling Functions
  const joinVideoCallRoom = useCallback((roomId: string, isInitiator: boolean) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket) {
      return;
    }

    console.log('🎥 Joining video call room:', roomId, 'as initiator:', isInitiator);
    currentSocket.emit('join_room', { roomId, isInitiator });
  }, [socket]);

  const sendWebRTCOffer = useCallback((offer: any, roomId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket) {
      return;
    }

    console.log('📡 Sending WebRTC offer to room:', roomId);
    currentSocket.emit('webrtc_offer', { offer, roomId });
  }, [socket]);

  const sendWebRTCAnswer = useCallback((answer: any, roomId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket) {
      return;
    }

    console.log('📡 Sending WebRTC answer to room:', roomId);
    currentSocket.emit('webrtc_answer', { answer, roomId });
  }, [socket]);

  const sendWebRTCIceCandidate = useCallback((candidate: any, roomId: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (!currentSocket) {
      return;
    }

    console.log('🧊 Sending WebRTC ICE candidate to room:', roomId);
    currentSocket.emit('webrtc_ice_candidate', { candidate, roomId });
  }, [socket]);

  // Existing functions (reactions, replies, etc.)
  const addReaction = useCallback((messageId: string, emoji: string, room: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (currentSocket && hasJoined) {
      currentSocket.emit('add_reaction', {
        messageId,
        emoji,
        room
      });
    }
  }, [socket, hasJoined]);

  const removeReaction = useCallback((messageId: string, emoji: string, room: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (currentSocket && hasJoined) {
      currentSocket.emit('remove_reaction', {
        messageId,
        emoji,
        room
      });
    }
  }, [socket, hasJoined]);

  const sendReply = useCallback((replyToId: string, replyToUsername: string, replyToContent: string, message: string) => {
    const currentSocket = socketRef.current || socket;
    
    if (currentSocket && hasJoined) {
      currentSocket.emit('send_reply', {
        replyToId,
        replyToUsername,
        replyToContent,
        message
      });
    }
  }, [socket, hasJoined]);

  // Private chat management functions
  const startPrivateChat = useCallback((userId?: string) => {
    console.log('🔒 Starting private chat with user:', userId);
    setCurrentPrivateChat(userId || null);
  }, []);

  const endPrivateChat = useCallback(() => {
    console.log('🔒 Ending private chat');
    setCurrentPrivateChat(null);
  }, []);

  const getCurrentPrivateMessages = useCallback(() => {
    if (!currentPrivateChat) return [];
    return privateMessages.filter(msg => 
      (msg.fromId === currentPrivateChat || msg.toId === currentPrivateChat)
    );
  }, [currentPrivateChat, privateMessages]);

  // Helper function to check if current user is video call initiator
  const isVideoCallInitiatorUser = useCallback(() => {
    return videoCallInitiator === socket?.id;
  }, [videoCallInitiator, socket?.id]);

  return {
    // Socket info
    socket: socketRef.current || socket,
    socketRef: socketRef.current,
    isConnected,
    
    // Regular chat
    messages,
    privateMessages,
    users,
    hasJoined,
    privateConversations,
    currentPrivateChat,
    messageReactions,
    joinRoom,
    sendMessage,
    sendPrivateMessage,
    addReaction,
    removeReaction,
    sendReply,
    
    // **NEW: Message editing/deletion functions**
    editMessage,
    deleteMessage,
    
    // Stranger chat
    chatMode,
    setChatMode,
    strangerUser,
    isSearchingStranger,
    strangerPartner,
    strangerMessages,
    strangerRoomId,
    enterStrangerMode,
    findStranger,
    sendStrangerMessage,
    skipStranger,
    
    // Video calls
    inVideoCall,
    incomingCall,
    videoCallRoom,
    videoCallInitiator,
    isVideoCallInitiatorUser,
    startVideoCall,
    acceptVideoCall,
    rejectVideoCall,
    endVideoCall,
    
    // WebRTC Signaling
    joinVideoCallRoom,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendWebRTCIceCandidate,
    
    // Private chat management
    startPrivateChat,
    endPrivateChat,
    getCurrentPrivateMessages,
    
    // Utility functions
    setTyping: () => {}
  };
};
