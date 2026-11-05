import { Plus, Search, Sparkles, UserPlus } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useToast } from '../context/ToastContext';
import { UserProfile } from '../types';
import { PostCard } from './PostCard';
import { StoriesRow } from './StoriesRow';

interface HomeFeedProps {
  onOpenCreatePost: () => void;
  onOpenSearch: () => void;
  onViewUserProfile: (user: UserProfile) => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  onOpenCreatePost,
  onOpenSearch,
  onViewUserProfile,
}) => {
  const { currentUser, isGuest } = useAuth();
  const { feedPosts, loadingFeed } = useSocial();
  const { showToast } = useToast();

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Stories Row matching mockup */}
      <StoriesRow
        onOpenCreatePost={onOpenCreatePost}
        onViewUserProfile={onViewUserProfile}
      />

      {/* "What's on your mind?" Create Post Card */}
      {currentUser && (
        <div
          onClick={() => {
            onOpenCreatePost();
          }}
          className="rounded-3xl bg-slate-900 border border-slate-800 p-3.5 flex items-center space-x-3 cursor-pointer hover:border-slate-700 transition-colors shadow-lg"
        >
          <img
            src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/30 shrink-0"
          />
          <div className="flex-1 rounded-full bg-slate-800/80 px-4 py-2.5 text-xs text-slate-400">
            What's on your mind? Share video, photos or music...
          </div>
          <button
            type="button"
            className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Posts stream */}
      <div className="space-y-4 pt-1">
        {loadingFeed ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Loading friends-only feed...
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Posts In Your Feed Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your home feed shows moments from accepted friends only. Add friends or publish your first moment with background music and tuned video!
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={onOpenSearch}
                className="flex items-center space-x-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Find Friends</span>
              </button>
              <button
                onClick={onOpenCreatePost}
                className="rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Create Post
              </button>
            </div>
          </div>
        ) : (
          feedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onViewUserProfile={onViewUserProfile}
            />
          ))
        )}
      </div>
    </div>
  );
};
