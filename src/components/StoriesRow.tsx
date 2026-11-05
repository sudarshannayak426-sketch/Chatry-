import { Plus, Sparkles } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useToast } from '../context/ToastContext';
import { UserProfile } from '../types';

interface StoriesRowProps {
  onOpenCreatePost: () => void;
  onViewUserProfile: (user: UserProfile) => void;
}

export const StoriesRow: React.FC<StoriesRowProps> = ({
  onOpenCreatePost,
  onViewUserProfile,
}) => {
  const { currentUser, isGuest } = useAuth();
  const { friendsList } = useSocial();
  const { showToast } = useToast();

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h3 className="text-xs font-bold text-slate-300 tracking-wide">Stories</h3>
      </div>

      <div className="flex items-center space-x-3.5 overflow-x-auto pb-2 scrollbar-none">
        {/* Current user's story / Create button */}
        {currentUser && (
          <div
            onClick={() => {
              if (isGuest) {
                showToast('Guest users cannot post stories. Please sign in or register.', 'info');
                return;
              }
              onOpenCreatePost();
            }}
            className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group"
          >
            <div className="relative">
              <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 ring-2 ring-transparent group-hover:scale-105 transition-transform">
                <img
                  src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
                  alt="Your story"
                  className="h-full w-full rounded-full object-cover ring-2 ring-slate-900"
                />
              </div>
              <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white shadow ring-2 ring-slate-900">
                <Plus className="h-3 w-3 stroke-[3]" />
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-300 truncate max-w-[60px]">
              Your story
            </span>
          </div>
        )}

        {/* Friends Stories */}
        {friendsList.length > 0 ? (
          friendsList.map((friend) => (
            <div
              key={friend.uid}
              onClick={() => onViewUserProfile(friend)}
              className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group"
            >
              <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 ring-2 ring-transparent group-hover:scale-105 transition-transform">
                <img
                  src={friend.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                  alt={friend.displayName}
                  className="h-full w-full rounded-full object-cover ring-2 ring-slate-900"
                />
              </div>
              <span className="text-[10px] font-medium text-slate-300 truncate max-w-[60px]">
                {friend.displayName.split(' ')[0]}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center space-x-2 text-slate-500 text-xs py-2 pl-2">
            <span className="text-[11px] italic">Add friends to see their stories here!</span>
          </div>
        )}
      </div>
    </div>
  );
};
