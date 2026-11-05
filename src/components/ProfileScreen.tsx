import {
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  Copy,
  Edit3,
  Grid,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MessageSquare,
  MoreVertical,
  Settings,
  Tag,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocial } from '../context/SocialContext';
import {
  generateUserCode,
  getFriendshipStatus,
  getUserPosts,
  getUserProfile,
} from '../firebase/firebaseService';
import { useToast } from '../context/ToastContext';
import { PostItem, RelationshipStatus, UserProfile } from '../types';
import {
  DEFAULT_BOT_BANNER,
  WHATSAPP_CLEAN_BANNER,
} from '../utils/botAvatars';
import { PostCard } from './PostCard';

interface ProfileScreenProps {
  user: UserProfile;
  onBack?: () => void;
  onOpenEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenFriendsModal: (tab: 'friends' | 'following') => void;
  onViewUserProfile: (user: UserProfile) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onBack,
  onOpenEditProfile,
  onOpenSettings,
  onOpenFriendsModal,
  onViewUserProfile,
}) => {
  const { currentUser, isGuest, updateProfileDetails } = useAuth();
  const { openChatWithUser } = useChat();
  const { handleFollowToggle, handleUnfollow, handleCancelRequest } = useSocial();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'tagged'>('posts');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>('none');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDpModalOpen, setIsDpModalOpen] = useState(false);

  const isMe = currentUser?.uid === user.uid;
  const userCode = user.userCode || generateUserCode(user.uid);

  useEffect(() => {
    getUserPosts(user.uid).then((p) => setPosts(p));

    if (currentUser && !isMe && !currentUser.isGuest) {
      getFriendshipStatus(currentUser.uid, user.uid).then((st) => setRelationshipStatus(st));
    }
  }, [user.uid, currentUser?.uid, isMe]);

  const onRelationshipAction = async () => {
    if (isGuest) {
      showToast('Guest accounts cannot follow or connect with users. Please sign up or log in.', 'info');
      return;
    }

    try {
      if (relationshipStatus === 'following' || relationshipStatus === 'friends') {
        await handleUnfollow(user.uid);
        const fallback = relationshipStatus === 'friends' ? 'followed_by' : 'none';
        setRelationshipStatus(fallback);
        showToast(`Unfollowed @${user.username}`, 'info');
      } else if (relationshipStatus === 'request_sent') {
        await handleCancelRequest(user.uid);
        setRelationshipStatus('none');
        showToast(`Follow request cancelled`, 'info');
      } else if (relationshipStatus === 'followed_by' || relationshipStatus === 'none') {
        const next = await handleFollowToggle(user);
        setRelationshipStatus(next);
        if (next === 'friends') {
          showToast(`You are now mutual friends with @${user.username}!`, 'success');
        } else if (next === 'request_sent') {
          showToast(`Follow request sent to @${user.username}`, 'info');
        } else {
          showToast(`Now following @${user.username}`, 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedId(true);
    showToast('Permanent UID copied to clipboard', 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyUserCode = () => {
    navigator.clipboard.writeText(userCode);
    setCopiedCode(true);
    showToast('User Code copied to clipboard', 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isWhatsAppClean = user.coverURL === 'whatsapp_clean' || user.coverURL === 'none';
  const currentBannerUrl = isWhatsAppClean
    ? WHATSAPP_CLEAN_BANNER
    : (user.coverURL || DEFAULT_BOT_BANNER);

  const currentDpUrl =
    user.photoURL ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || 'bot')}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const directBannerInputRef = useRef<HTMLInputElement>(null);
  const directDpInputRef = useRef<HTMLInputElement>(null);

  // Quick client-side image compressor
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleDirectBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file, 1200, 600, 0.85);
        await updateProfileDetails({ coverURL: dataUrl });
        showToast('Banner uploaded & updated successfully! 🖼️', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to upload banner', 'error');
      }
    }
  };

  const handleDirectDpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file, 600, 600, 0.85);
        await updateProfileDetails({ photoURL: dataUrl });
        showToast('Profile photo uploaded & updated successfully! 📸', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to upload DP', 'error');
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-10 bg-slate-950 min-h-screen">
      {/* Hidden file pickers for instant upload */}
      <input
        type="file"
        ref={directBannerInputRef}
        onChange={handleDirectBannerUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={directDpInputRef}
        onChange={handleDirectDpUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Bot Cyber / WhatsApp Clean Cover Header */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-950">
        <img
          src={currentBannerUrl}
          alt="Cover"
          className="h-full w-full object-cover transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-slate-950" />

        {/* Top controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white z-10">
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 rounded-full bg-slate-900/60 backdrop-blur-md hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : <div />}

          {isMe && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => directBannerInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md hover:bg-slate-900 border border-white/10 text-xs font-semibold text-white flex items-center space-x-1 shadow transition-colors"
                title="Upload banner from device"
              >
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Change Banner</span>
              </button>
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-full bg-slate-900/60 backdrop-blur-md hover:bg-slate-900 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Details Container */}
      <div className="px-5 -mt-20 relative z-20">
        {/* Avatar with verified badge & larger DP view */}
        <div className="flex justify-between items-end mb-3">
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsDpModalOpen(true)}
              className="relative block rounded-full focus:outline-none focus:ring-4 focus:ring-cyan-500/50 group"
              title="Click to view full size DP"
            >
              <img
                src={currentDpUrl}
                alt={user.displayName}
                className="h-28 w-28 sm:h-36 sm:w-36 rounded-full object-cover ring-4 ring-slate-950 shadow-2xl shadow-indigo-500/30 group-hover:brightness-110 transition-all cursor-pointer bg-slate-900"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="h-6 w-6 text-white drop-shadow" />
              </div>
            </button>
            {isMe && (
              <button
                type="button"
                onClick={() => directDpInputRef.current?.click()}
                className="absolute bottom-0 left-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg ring-2 ring-slate-950 transition-all hover:scale-110 z-20 cursor-pointer"
                title="Upload profile photo from gallery"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
            {user.isOnline && (
              <span className="absolute bottom-1 right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-emerald-500 ring-4 ring-slate-950 shadow z-20" />
            )}
          </div>

          {isMe && (
            <div className="flex items-center space-x-1.5 mb-1">
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-300 hover:text-white flex items-center space-x-1.5 shadow transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Edit Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Name and handle matching mockup */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <h2 className="text-lg font-bold text-white">{user.displayName}</h2>
            <CheckCircle2 className="h-4 w-4 text-blue-400 fill-blue-500/20" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <p className="text-xs text-indigo-400 font-mono font-semibold">@{user.username}</p>
            {user.email && (
              <span className="text-xs text-slate-400 font-mono flex items-center space-x-1">
                <span className="text-slate-600">•</span>
                <span>{user.email}</span>
              </span>
            )}

            <button
              onClick={copyUserCode}
              className="text-[10px] text-indigo-300 hover:text-white font-mono font-bold flex items-center space-x-1 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30 transition-colors"
              title="Public User Code (Shareable)"
            >
              <span>{userCode}</span>
              <Copy className="h-2.5 w-2.5" />
              {copiedCode && <span className="text-emerald-400 text-[9px]">Copied!</span>}
            </button>

            <button
              onClick={copyUserId}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 transition-colors"
              title={`Permanent Internal Firebase UID: ${user.uid}`}
            >
              <Lock className="h-2.5 w-2.5 text-slate-500" />
              <span>UID</span>
              <Copy className="h-2.5 w-2.5" />
              {copiedId && <span className="text-emerald-400 text-[9px]">Copied!</span>}
            </button>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
            {user.bio}
          </p>
        )}

        {/* Stats Row matching mockup Screen 5 (Posts, Followers/Friends, Following) */}
        <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-2xl bg-slate-900/80 border border-slate-800 my-4 text-center">
          <div className="p-1">
            <p className="text-base font-bold text-white">{posts.length || user.postsCount || 0}</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Posts</p>
          </div>
          <button
            onClick={() => onOpenFriendsModal('friends')}
            className="p-1 hover:bg-slate-800/60 rounded-xl transition-colors"
          >
            <p className="text-base font-bold text-white">{user.followersCount || user.friendsCount || 0}</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Followers</p>
          </button>
          <button
            onClick={() => onOpenFriendsModal('following')}
            className="p-1 hover:bg-slate-800/60 rounded-xl transition-colors"
          >
            <p className="text-base font-bold text-white">{user.followingCount || 0}</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Following</p>
          </button>
        </div>

        {/* Action Buttons matching mockup */}
        <div className="flex items-center space-x-2 mb-5">
          {isMe ? (
            <button
              onClick={onOpenEditProfile}
              className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-semibold text-white transition-all text-center"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={onRelationshipAction}
                className={`flex-1 rounded-xl py-2.5 text-xs font-semibold shadow-md transition-all ${
                  relationshipStatus === 'friends'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400'
                    : relationshipStatus === 'following'
                    ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400'
                    : relationshipStatus === 'followed_by'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                    : relationshipStatus === 'request_sent'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-rose-500/10 hover:text-rose-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {relationshipStatus === 'friends'
                  ? 'Friends'
                  : relationshipStatus === 'following'
                  ? 'Following'
                  : relationshipStatus === 'followed_by'
                  ? 'Follow Back'
                  : relationshipStatus === 'request_sent'
                  ? 'Requested'
                  : 'Follow'}
              </button>

              <button
                onClick={() => openChatWithUser(user)}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-semibold text-white transition-all text-center flex items-center justify-center space-x-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                <span>Message</span>
              </button>
            </>
          )}
        </div>

        {/* Tabs matching mockup: Posts | Media | Tagged */}
        <div className="flex border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'posts'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'media'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Media
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'tagged'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Tagged
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-4 space-y-4">
          {activeTab === 'posts' && (
            posts.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">No moments posted yet.</p>
            ) : (
              posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onViewUserProfile={onViewUserProfile}
                />
              ))
            )
          )}

          {activeTab === 'media' && (
            <div className="grid grid-cols-3 gap-2">
              {posts.filter((p) => p.mediaUrl).length === 0 ? (
                <p className="col-span-3 text-center text-xs text-slate-500 py-8">No media photos or videos yet.</p>
              ) : (
                posts.filter((p) => p.mediaUrl).map((p) => (
                  <div key={p.id} className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                    {p.mediaType === 'video' ? (
                      <video src={p.mediaUrl} className="h-full w-full object-cover" />
                    ) : (
                      <img src={p.mediaUrl} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tagged' && (
            <p className="text-center text-xs text-slate-500 py-8">No tagged moments found.</p>
          )}
        </div>
      </div>

      {/* Bigger DP Lightbox Modal */}
      {isDpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsDpModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsDpModalOpen(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-bold text-white mb-1">{user.displayName}'s Profile Picture</h3>
            <p className="text-xs text-indigo-400 font-mono mb-4">@{user.username}</p>

            {/* High-res / Big DP Display */}
            <div className="relative mx-auto my-2 w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-slate-950 border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center p-2">
              <img
                src={currentDpUrl}
                alt={user.displayName}
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {isMe && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDpModalOpen(false);
                    onOpenEditProfile();
                  }}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Change Profile Photo
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDpModalOpen(false)}
                className="flex-1 rounded-2xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

