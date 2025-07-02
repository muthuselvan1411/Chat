import React from 'react';
import { User } from '../types';

interface UserListProps {
  users: User[];
  currentUsername: string;
  onUserClick?: (user: User) => void;
  selectedUser?: User | null;
}

const UserList: React.FC<UserListProps> = ({ users, currentUsername, onUserClick, selectedUser }) => {
  const onlineUsers = users.filter(user => user.isOnline);
  const offlineUsers = users.filter(user => !user.isOnline);

  const renderUser = (user: User) => (
    <div 
      key={user.id} 
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        selectedUser?.id === user.id 
          ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      } ${user.username === currentUsername ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}`}
      onClick={() => onUserClick?.(user)}
    >
      <div className="relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
          user.username === currentUsername 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
            : user.isOnline 
              ? 'bg-gradient-to-br from-green-400 to-blue-500' 
              : 'bg-gradient-to-br from-gray-400 to-gray-600'
        }`}>
          <span className="text-sm">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              user.username === currentUsername 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {user.username}
            {user.username === currentUsername && ' (You)'}
          </span>
          {user.username === currentUsername && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={user.isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
            {user.isOnline ? 'Online' : 'Offline'}
          </span>
          {user.username !== currentUsername && (
            <span className="text-gray-400 dark:text-gray-500">• Click to chat</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
            Online ({onlineUsers.length})
          </h4>
          <div className="space-y-1">
            {onlineUsers.map(renderUser)}
          </div>
        </div>
      )}

      {/* Offline Users */}
      {offlineUsers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Offline ({offlineUsers.length})
          </h4>
          <div className="space-y-1">
            {offlineUsers.map(renderUser)}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            No users online
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
