import {
  Check,
  Heart,
  MessageCircle,
  MoreVertical,
  Music,
  Pause,
  Play,
  Send,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useToast } from '../context/ToastContext';
import { PostComment, PostItem, UserProfile } from '../types';

interface PostCardProps {
  post: PostItem;
  onViewUserProfile: (user: UserProfile) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onViewUserProfile }) => {
  const { currentUser, isGuest } = useAuth();
  const { handleToggleLike, handleDeletePost, handleGetComments, handleAddComment } = useSocial();
  const { showToast } = useToast();

  const [isLiked, setIsLiked] = useState(
    currentUser ? post.likes.includes(currentUser.uid) : false
  );
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Audio state if post has attached music
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioVolume, setAudioVolume] = useState(post.audioVolume ?? 80);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      setIsLiked(post.likes.includes(currentUser.uid));
    }
    setLikesCount(post.likes.length);
  }, [post.likes, currentUser?.uid]);

  // Sync video properties when post changes or plays
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = post.videoSpeed || 1;
      videoRef.current.muted = post.videoMuted ?? false;
      if (post.videoVolume !== undefined) {
        videoRef.current.volume = post.videoVolume / 100;
      }
      videoRef.current.loop = post.videoLoop ?? true;
    }
  }, [post.videoSpeed, post.videoMuted, post.videoVolume, post.videoLoop]);

  const onLikeClick = async () => {
    if (isGuest) {
      showToast('Guest accounts cannot like posts. Please log in or register.', 'info');
      return;
    }
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    try {
      await handleToggleLike(post);
    } catch {
      setIsLiked(!nextState);
      setLikesCount((prev) => (nextState ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const toggleComments = async () => {
    if (!commentsOpen) {
      const list = await handleGetComments(post.id);
      setComments(list);
    }
    setCommentsOpen(!commentsOpen);
  };

  const onAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    if (isGuest) {
      showToast('Guest accounts cannot comment. Please log in or register.', 'info');
      return;
    }

    try {
      setSubmittingComment(true);
      const newC = await handleAddComment(post, commentText.trim());
      setComments((prev) => [...prev, newC]);
      setCommentText('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      if (audioRef.current.currentTime === 0 && post.audioStartOffset) {
        audioRef.current.currentTime = post.audioStartOffset;
      }
      audioRef.current.volume = audioVolume / 100;
      audioRef.current.loop = post.audioLoop ?? true;
      audioRef.current.play().catch(console.error);
      setIsPlayingAudio(true);
    }
  };

  const handleVolumeChange = (v: number) => {
    setAudioVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v / 100;
    }
  };

  const getVideoAspectClass = () => {
    switch (post.videoAspectRatio) {
      case '16/9':
        return 'aspect-video max-h-96 w-full object-cover';
      case '1/1':
        return 'aspect-square max-h-96 w-full object-cover';
      case '9/16':
        return 'aspect-[9/16] max-h-[480px] w-full object-cover';
      case '4/5':
        return 'aspect-[4/5] max-h-[460px] w-full object-cover';
      default:
        return 'max-h-96 w-full object-contain';
    }
  };

  const getVideoFilterClass = () => {
    switch (post.videoFilter) {
      case 'vibrant':
        return 'contrast-110 saturate-150';
      case 'cinema':
        return 'contrast-125 brightness-95 sepia-[0.25]';
      case 'vintage':
        return 'sepia-[0.5] contrast-90';
      case 'bw':
        return 'grayscale contrast-125';
      case 'warm':
        return 'contrast-105 saturate-125 hue-rotate-[-10deg]';
      default:
        return '';
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const isOwner = currentUser?.uid === post.authorId;

  return (
    <article className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
      {/* Author Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          onClick={() =>
            onViewUserProfile({
              uid: post.authorId,
              username: post.authorUsername,
              displayName: post.authorName,
              email: '',
              photoURL: post.authorPhoto,
              bio: '',
              isOnline: false,
              lastSeen: 0,
              createdAt: 0,
              friendsCount: 0,
              postsCount: 0,
              isPrivate: false,
              showOnlineStatus: false,
              blockedUsers: [],
            })
          }
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <img
            src={post.authorPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorUsername}`}
            alt={post.authorName}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/20 group-hover:ring-indigo-500 transition-all"
          />
          <div>
            <div className="flex items-center space-x-1">
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                {post.authorName}
              </h4>
            </div>
            <p className="text-[10px] text-slate-400">
              @{post.authorUsername} • {formatTime(post.createdAt)}
            </p>
          </div>
        </div>

        {/* 3-dots Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-36 rounded-2xl bg-slate-800 border border-slate-700 p-1.5 shadow-xl z-40">
                {isOwner ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm('Delete this post?')) {
                        handleDeletePost(post.id);
                      }
                    }}
                    className="w-full flex items-center space-x-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Post</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      showToast('Post reported for moderation.', 'info');
                    }}
                    className="w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 text-left"
                  >
                    Report Post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Caption text */}
      {post.caption && (
        <p className="text-xs text-slate-200 leading-relaxed mb-3 whitespace-pre-wrap">
          {post.caption}
        </p>
      )}

      {/* Media Card (Photo or Video) with Aspect Ratio & Filter Adjustments */}
      {post.mediaUrl && (
        <div className="rounded-2xl overflow-hidden mb-3 bg-slate-950 border border-slate-800 flex items-center justify-center relative group">
          {post.mediaType === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={post.mediaUrl}
                controls
                playsInline
                className={`${getVideoAspectClass()} ${getVideoFilterClass()} transition-all`}
              />
              {/* Optional badges for video speed or filter */}
              {((post.videoFilter && post.videoFilter !== 'none') || (post.videoSpeed && post.videoSpeed !== 1)) && (
                <div className="absolute top-2 left-2 flex items-center space-x-1.5 pointer-events-none">
                  {post.videoSpeed && post.videoSpeed !== 1 && (
                    <span className="bg-slate-900/80 backdrop-blur-sm text-[9px] font-bold text-indigo-300 px-1.5 py-0.5 rounded-md border border-slate-700">
                      {post.videoSpeed}x
                    </span>
                  )}
                  {post.videoFilter && post.videoFilter !== 'none' && (
                    <span className="bg-slate-900/80 backdrop-blur-sm text-[9px] font-bold text-pink-300 px-1.5 py-0.5 rounded-md border border-slate-700 capitalize">
                      {post.videoFilter}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post content"
              className="max-h-96 w-full object-cover"
            />
          )}
        </div>
      )}

      {/* Playable Music Bar if post has audio attached */}
      {post.audioUrl && (
        <div className="mb-3 p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5 min-w-0">
            <button
              onClick={toggleAudio}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow hover:scale-105 transition-transform shrink-0"
              title={isPlayingAudio ? 'Pause Music' : 'Play Music'}
            >
              {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate flex items-center space-x-1">
                <Music className="h-3 w-3 text-pink-400 inline shrink-0" />
                <span className="truncate">{post.audioTitle || 'Background Music'}</span>
              </p>
              <p className="text-[10px] text-indigo-300 truncate">
                {post.audioArtist || 'Authorized Artist'}
                {post.audioStartOffset ? ` • Starts at 0:${post.audioStartOffset.toString().padStart(2, '0')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Animated Equalizer Waveform while playing */}
            {isPlayingAudio && (
              <div className="flex items-end space-x-0.5 h-3.5 px-1">
                <div className="w-0.5 bg-pink-400 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0ms' }} />
                <div className="w-0.5 bg-indigo-400 rounded-full animate-bounce h-3.5" style={{ animationDelay: '150ms' }} />
                <div className="w-0.5 bg-purple-400 rounded-full animate-bounce h-2" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <button
              onClick={() => handleVolumeChange(audioVolume === 0 ? 80 : 0)}
              className="text-slate-400 hover:text-white"
            >
              {audioVolume === 0 ? <VolumeX className="h-3.5 w-3.5 text-slate-500" /> : <Volume2 className="h-3.5 w-3.5 text-indigo-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={audioVolume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <audio
            ref={audioRef}
            src={post.audioUrl}
            onEnded={() => {
              if (!(post.audioLoop ?? true)) setIsPlayingAudio(false);
            }}
            className="hidden"
          />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <button
            onClick={onLikeClick}
            className={`flex items-center space-x-1.5 transition-colors ${
              isLiked ? 'text-pink-500 font-bold' : 'hover:text-pink-400 text-slate-400'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-pink-500 text-pink-500 scale-110' : ''}`} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center space-x-1.5 hover:text-indigo-400 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentsCount || comments.length || 0}</span>
          </button>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            showToast('Post link copied to clipboard!', 'success');
          }}
          className="hover:text-white transition-colors"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Comments Drawer */}
      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
          {/* List of comments */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-1">No comments yet. Say something friendly!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start space-x-2 text-xs">
                  <img
                    src={c.authorPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.authorUsername}`}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="bg-slate-800/80 rounded-2xl px-3 py-1.5 flex-1">
                    <p className="text-[11px] font-bold text-white">{c.authorName}</p>
                    <p className="text-slate-200 text-xs">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          {currentUser && (
            <form onSubmit={onAddComment} className="flex items-center space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-full bg-slate-800 border border-slate-700/60 px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="h-7 w-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
};
