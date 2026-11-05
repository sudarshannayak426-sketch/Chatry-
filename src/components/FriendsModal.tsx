import { ArrowLeft, Check, UserCheck, UserPlus, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocial } from '../context/SocialContext';
import { getFollowersList, getFollowingList, getFriendsList } from '../firebase/firebaseService';
import { UserProfile } from '../types';

interface FriendsModalProps {
  initialTab?: 'friends' | 'following';
  targetUser: UserProfile;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  initialTab = 'friends',
  targetUser,
  onClose,
  onSelectUser,
}) => {
  const { currentUser } = useAuth();
  const { openChatWithUser } = useChat();
  const [tab, setTab] = useState<'friends' | 'following'>(initialTab);
  const [list, setList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    const fetcher = tab === 'friends' ? getFollowersList : getFollowingList;
    fetcher(targetUser.uid).then((res) => {
      if (!isCurrent) return;
      setList(res);
      setLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [targetUser.uid, tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        {/* Header matching mockup Screens 11 & 12 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold text-white">
              {tab === 'friends' ? 'Followers' : 'Following'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 my-3 text-xs font-semibold">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'friends' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Followers ({targetUser.friendsCount || list.length})
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'following' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Following ({targetUser.followingCount || list.length})
          </button>
        </div>

        {/* User list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
              Loading list...
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No accepted connections yet.
            </div>
          ) : (
            list.map((u) => (
              <div
                key={u.uid}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/40"
              >
                <div
                  onClick={() => {
                    onClose();
                    onSelectUser(u);
                  }}
                  className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0 pr-2"
                >
                  <img
                    src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{u.displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-1.5">
                  <span className="rounded-xl bg-slate-800 px-3 py-1 text-xs text-slate-300 font-semibold border border-slate-700">
                    Following
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
