import {
  ArrowLeft,
  Check,
  Clock,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocial } from '../context/SocialContext';
import { getFriendshipStatus, searchUsers } from '../firebase/firebaseService';
import { useToast } from '../context/ToastContext';
import { RelationshipStatus, UserProfile } from '../types';

interface SearchUsersScreenProps {
  onBack?: () => void;
  onViewUserProfile: (user: UserProfile) => void;
}

export const SearchUsersScreen: React.FC<SearchUsersScreenProps> = ({
  onBack,
  onViewUserProfile,
}) => {
  const { currentUser, isGuest } = useAuth();
  const { handleFollowToggle, handleUnfollow, handleCancelRequest } = useSocial();
  const { openChatWithUser } = useChat();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, RelationshipStatus>>({});

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    searchUsers(query, currentUser?.uid).then(async (results) => {
      if (!isCurrent) return;
      // Filter out blocked users
      const blocked = currentUser?.blockedUsers || [];
      const cleanResults = results.filter((u) => !blocked.includes(u.uid));
      setUsers(cleanResults);
      setLoading(false);

      if (currentUser && !currentUser.isGuest) {
        const map: Record<string, RelationshipStatus> = {};
        for (const u of cleanResults) {
          try {
            map[u.uid] = await getFriendshipStatus(currentUser.uid, u.uid);
          } catch {
            map[u.uid] = 'none';
          }
        }
        if (isCurrent) setStatusMap(map);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [query, currentUser?.uid, currentUser?.blockedUsers]);

  const onToggleAction = async (targetUser: UserProfile) => {
    if (isGuest) {
      showToast('Guest accounts cannot follow users. Please sign up or log in.', 'info');
      return;
    }
    const currentStatus = statusMap[targetUser.uid] || 'none';

    try {
      if (currentStatus === 'following' || currentStatus === 'friends') {
        await handleUnfollow(targetUser.uid);
        const fallback = currentStatus === 'friends' ? 'followed_by' : 'none';
        setStatusMap((prev) => ({ ...prev, [targetUser.uid]: fallback }));
        showToast(`Unfollowed @${targetUser.username}`, 'info');
      } else if (currentStatus === 'request_sent') {
        await handleCancelRequest(targetUser.uid);
        setStatusMap((prev) => ({ ...prev, [targetUser.uid]: 'none' }));
        showToast('Follow request cancelled', 'info');
      } else if (currentStatus === 'followed_by' || currentStatus === 'none') {
        const nextStatus = await handleFollowToggle(targetUser);
        setStatusMap((prev) => ({ ...prev, [targetUser.uid]: nextStatus }));
        if (nextStatus === 'friends') {
          showToast(`You are now mutual friends with @${targetUser.username}! 🎉`, 'success');
        } else if (nextStatus === 'request_sent') {
          showToast(`Follow request sent to @${targetUser.username}`, 'info');
        } else {
          showToast(`Now following @${targetUser.username}`, 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Header matching mockup */}
      <div className="flex items-center space-x-3 pb-2">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-lg font-bold text-white">Search Users</h2>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or ID"
          className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggested List matching Mockup Screen 6 */}
      <div className="space-y-3 pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {query ? 'Results' : 'Suggested'}
        </p>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Searching Chatry community...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No users found matching "{query}".
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => {
              const status = statusMap[user.uid] || 'none';
              return (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div
                    onClick={() => onViewUserProfile(user)}
                    className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0 pr-3"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                        alt={user.displayName}
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/20"
                      />
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white truncate">{user.displayName}</h4>
                      <div className="flex items-center space-x-1.5">
                        <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                        <span className="font-mono text-[9px] bg-indigo-950/60 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.2 rounded font-bold">
                          {user.userCode || `CHR-${user.uid.substring(0, 6).toUpperCase()}`}
                        </span>
                      </div>
                      {user.bio && (
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">{user.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Follow / Friend Button matching mockup */}
                  <div className="shrink-0">
                    <button
                      onClick={() => onToggleAction(user)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shadow-md ${
                        status === 'friends'
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400'
                          : status === 'following'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400'
                          : status === 'followed_by'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                          : status === 'request_sent'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-rose-500/10 hover:text-rose-400'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                      }`}
                    >
                      {status === 'friends'
                        ? 'Friends'
                        : status === 'following'
                        ? 'Following'
                        : status === 'followed_by'
                        ? 'Follow Back'
                        : status === 'request_sent'
                        ? 'Requested'
                        : 'Follow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
