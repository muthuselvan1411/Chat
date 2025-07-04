export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  content: string;
  userId?: string;
  username: string;
  timestamp: string;
  type: 'message' | 'system' | 'private'|'file';
  file?:any;
  room?: string;
  from?: string;
  fromId?: string;
  to?: string;
  toId?: string;
  fromSelf?: boolean;
  reactions?: Reaction[];
  replyTo?: {
    messageId: string;
    username: string;
    content: string;
  };
  status?: 'sent' | 'delivered' | 'read';
  edited?: boolean;        // Add this
  edited_at?: string;      // Add this
}
export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  users: User[];
  messages: Message[];
}

export interface PrivateConversation {
  userId: string;
  username: string;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface TypingUser {
  username: string;
  userId: string;
  room?: string;
  typing: boolean;
  isPrivate: boolean;
}

export interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  user_joined: (data: { user: User }) => void;
  user_left: (data: { user: User }) => void;
  message: (message: Message) => void;
  private_message: (message: Message) => void;
  private_message_history: (data: { messages: Message[]; userId: string }) => void;
  typing: (data: TypingUser) => void;
  users_update: (users: User[]) => void;
  join_success: (data: { room: string; username: string; status: string }) => void;
  room_users: (data: { room: string; users: User[]; count: number }) => void;
  user_typing: (data: TypingUser) => void;
}

export interface ClientEvents {
  join_room: (data: { username: string; roomId: string }) => void;
  send_message: (data: { message: string; room: string }) => void;
  private_message: (data: { message: string; to: string }) => void;
  get_private_messages: (data: { userId: string }) => void;
  typing_start: (data: { room?: string; isPrivate?: boolean; targetUserId?: string }) => void;
  typing_stop: (data: { room?: string; isPrivate?: boolean; targetUserId?: string }) => void;
  disconnect: () => void;
}
