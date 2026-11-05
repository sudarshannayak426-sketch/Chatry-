import {
  MessageSquare,
  MessageSquarePlus,
  MoreVertical,
  Plus,
  Search,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocial } from '../context/SocialContext';
import { Conversation, UserProfile } from '../types';

interface ChatListProps {
  onStartNewChat: () => void;
  onViewUserProfile: (user: UserProfile) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ onStartNewChat, onViewUserProfile }) => {
  const { currentUser, isGuest } = useAuth();
  const { conversations, activeConversation, selectConversation, loadingChats } = useChat();
  const { friendsList } = useSocial();
  const [filter, setFilter] = useState('');

  if (!currentUser) return null;

  const filteredConversations = conversations.filter((c) => {
    if (!filter.trim()) return true;
    const otherId = c.participants.find((id) => id !== currentUser.uid);
    const details = otherId ? c.participantDetails?.[otherId] : null;
    const name = details?.displayName?.toLowerCase() || '';
    const last = c.lastMessage?.text?.toLowerCase() || '';
    return name.includes(filter.toLowerCase()) || last.includes(filter.toLowerCase());
  });

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 max-w-xl mx-auto w-full">
      {/* Header matching mockup */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Chats</h2>
            {conversations.length > 0 && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-semibold">
                {conversations.length}
              </span>
            )}
          </div>
          <button
            onClick={onStartNewChat}
            className="flex items-center space-x-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {isGuest ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-white">Private Messaging is Disabled in Guest Mode</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Please sign up or log in to message accepted friends in real-time.
            </p>
          </div>
        ) : loadingChats ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <MessageSquarePlus className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No active chats</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Start a one-to-one conversation with any of your accepted friends.
            </p>

            {friendsList.length > 0 && (
              <div className="pt-3 max-w-sm mx-auto text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Accepted Friends:
                </p>
                <div className="space-y-1.5">
                  {friendsList.map((f) => (
                    <div
                      key={f.uid}
                      onClick={() => onStartNewChat()}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={f.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${f.username}`}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{f.displayName}</p>
                          <p className="text-[10px] text-slate-400">@{f.username}</p>
                        </div>
                      </div>
                      <span className="text-xs text-indigo-400 font-semibold">Message &rarr;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherId = conv.participants.find((id) => id !== currentUser.uid) || '';
            const details = conv.participantDetails?.[otherId] || {
              displayName: 'Friend',
              username: 'friend',
              photoURL: '',
              isOnline: false,
            };
            const unread = conv.unreadCounts?.[currentUser.uid] || 0;
            const isSelected = activeConversation?.id === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`flex items-center space-x-3 p-3.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-600/15 border-l-4 border-indigo-500' : 'hover:bg-slate-800/50'
                }`}
              >
                {/* Avatar with online dot */}
                <div className="relative shrink-0">
                  <img
                    src={details.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${details.username}`}
                    alt={details.displayName}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/20"
                  />
                  {details.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                  )}
                </div>

                {/* Info matching mockup Screen 8 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-white truncate">{details.displayName}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 truncate pr-2">
                      {conv.lastMessage?.text || 'Started a conversation'}
                    </p>

                    {/* Unread Pill Badge (green circle matching mockup) */}
                    {unread > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white shrink-0 shadow">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
