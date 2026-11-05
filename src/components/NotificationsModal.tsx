import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  MessageSquare,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocial } from '../context/SocialContext';
import { getUserProfile } from '../firebase/firebaseService';
import { NotificationItem, UserProfile } from '../types';

interface NotificationsModalProps {
  onClose: () => void;
  onViewUserProfile: (user: UserProfile) => void;
  onOpenFriendRequests: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onViewUserProfile,
  onOpenFriendRequests,
}) => {
  const { notifications, handleMarkNotifRead, handleMarkAllNotifsRead } = useSocial();
  const { openChatWithUser } = useChat();

  const handleNotificationClick = async (notif: NotificationItem) => {
    await handleMarkNotifRead(notif.id);

    if (notif.type === 'friend_request') {
      onClose();
      onOpenFriendRequests();
    } else if (notif.type === 'new_message') {
      const sender = await getUserProfile(notif.senderId);
      if (sender) {
        onClose();
        await openChatWithUser(sender);
      }
    } else {
      const sender = await getUserProfile(notif.senderId);
      if (sender) {
        onClose();
        onViewUserProfile(sender);
      }
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-3.5 w-3.5 text-blue-400" />;
      case 'friend_accepted':
        return <UserCheck className="h-3.5 w-3.5 text-emerald-400" />;
      case 'new_message':
        return <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />;
      case 'post_like':
        return <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />;
      case 'post_comment':
        return <MessageCircle className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Notifications</h3>
          </div>
          <div className="flex items-center space-x-2">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllNotifsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 py-3 max-h-[60vh] overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="mx-auto h-10 w-10 text-slate-600 mb-1" />
              <p className="text-xs font-semibold text-white">No notifications yet</p>
              <p className="text-[11px] text-slate-500">
                You'll receive alerts for friend requests, accepted friendships, likes, and messages.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-2xl flex items-start space-x-3 cursor-pointer border transition-colors ${
                  notif.read
                    ? 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                    : 'bg-indigo-950/30 border-indigo-500/30 hover:bg-indigo-900/30'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={notif.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.senderUsername}`}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-snug">
                    <span className="font-bold text-white mr-1">{notif.senderName}</span>
                    <span>{notif.message}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {!notif.read && (
                  <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
