import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  acceptFriendRequest,
  addPostComment,
  cancelFriendRequest,
  createPost,
  deletePost,
  followUser,
  getFollowersList,
  getFollowingList,
  getFriendsList,
  getPostComments,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  subscribeToFriendRequests,
  subscribeToFriendsFeed,
  subscribeToNotifications,
  toggleLikePost,
  unfollowUser,
} from '../firebase/firebaseService';
import {
  FriendRequest,
  NotificationItem,
  PostComment,
  PostItem,
  RelationshipStatus,
  UserProfile,
} from '../types';
import { isFirebaseConfigured } from '../firebase/config';

interface SocialContextType {
  feedPosts: PostItem[];
  friendRequests: FriendRequest[];
  notifications: NotificationItem[];
  friendsList: UserProfile[];
  followersList: UserProfile[];
  followingList: UserProfile[];
  unreadNotifsCount: number;
  loadingFeed: boolean;
  handleSendRequest: (targetUser: UserProfile) => Promise<void>;
  handleCancelRequest: (receiverId: string) => Promise<void>;
  handleAcceptRequest: (req: FriendRequest) => Promise<void>;
  handleRejectRequest: (reqId: string) => Promise<void>;
  handleRemoveFriend: (targetUid: string) => Promise<void>;
  handleFollowToggle: (targetUser: UserProfile) => Promise<RelationshipStatus>;
  handleUnfollow: (targetUid: string) => Promise<void>;
  handleCreatePost: (
    caption: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'none',
    audioUrl?: string,
    audioTitle?: string,
    audioArtist?: string,
    visibility?: 'friends' | 'public',
    adjustments?: {
      audioVolume?: number;
      audioLoop?: boolean;
      audioStartOffset?: number;
      videoAspectRatio?: 'original' | '16/9' | '1/1' | '9/16' | '4/5';
      videoSpeed?: number;
      videoMuted?: boolean;
      videoVolume?: number;
      videoFilter?: 'none' | 'vibrant' | 'cinema' | 'vintage' | 'bw' | 'warm';
      videoLoop?: boolean;
    }
  ) => Promise<PostItem>;
  handleDeletePost: (postId: string) => Promise<void>;
  handleToggleLike: (post: PostItem) => Promise<boolean>;
  handleGetComments: (postId: string) => Promise<PostComment[]>;
  handleAddComment: (post: PostItem, text: string) => Promise<PostComment>;
  handleMarkNotifRead: (notifId: string) => Promise<void>;
  handleMarkAllNotifsRead: () => Promise<void>;
  refreshFriends: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

const STORAGE_POSTS_KEY = 'chatry_feed_posts';

const SEED_POSTS: PostItem[] = [
  {
    id: 'seed_post_music_1',
    authorId: 'chr_bot_alexa',
    authorName: 'Aria Horizon',
    authorUsername: 'aria_tunes',
    authorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    caption: 'Chilling on a starry evening with lo-fi vibes ✨ Headphones on, world off 🎧🎵',
    mediaUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    audioTitle: 'Warm Sunset Dreams',
    audioArtist: 'Purrple Cat',
    audioVolume: 85,
    audioLoop: true,
    likes: ['user_demo_1', 'user_demo_2'],
    commentsCount: 2,
    createdAt: Date.now() - 3600000 * 2,
    visibility: 'friends',
  },
  {
    id: 'seed_post_video_2',
    authorId: 'chr_bot_neo',
    authorName: 'Neo Pixel',
    authorUsername: 'neovibes',
    authorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    caption: 'Nature in motion 🌊 Adjusted color grade and video aspect ratio for the mood! 🎥',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    mediaType: 'video',
    videoAspectRatio: '16/9',
    videoSpeed: 1,
    videoFilter: 'vibrant',
    videoLoop: true,
    videoVolume: 70,
    likes: ['user_demo_3'],
    commentsCount: 1,
    createdAt: Date.now() - 3600000 * 8,
    visibility: 'friends',
  },
];

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [feedPosts, setFeedPosts] = useState<PostItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_POSTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return SEED_POSTS;
  });
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(false);

  const savePostsToStorage = (posts: PostItem[]) => {
    try {
      localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
    } catch (err) {
      console.warn('Could not save posts to localStorage:', err);
    }
  };

  const refreshFriends = async () => {
    if (!currentUser || currentUser.isGuest || !isFirebaseConfigured()) {
      setFriendsList([]);
      setFollowersList([]);
      setFollowingList([]);
      return;
    }
    try {
      const [friends, followers, following] = await Promise.all([
        getFriendsList(currentUser.uid),
        getFollowersList(currentUser.uid),
        getFollowingList(currentUser.uid),
      ]);
      setFriendsList(friends);
      setFollowersList(followers);
      setFollowingList(following);
    } catch (err) {
      console.warn('Could not load connections list:', err);
    }
  };

  // Subscribe to friend requests & notifications
  useEffect(() => {
    if (!currentUser || currentUser.isGuest || !isFirebaseConfigured()) {
      setFriendRequests([]);
      setNotifications([]);
      return;
    }

    refreshFriends();

    const unsubReqs = subscribeToFriendRequests(currentUser.uid, (reqs) => {
      setFriendRequests(reqs);
    });

    const unsubNotifs = subscribeToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubReqs();
      unsubNotifs();
    };
  }, [currentUser?.uid, currentUser?.isGuest]);

  // Subscribe to feed of accepted friends and followed users
  useEffect(() => {
    if (!currentUser) {
      setLoadingFeed(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setLoadingFeed(false);
      return;
    }

    setLoadingFeed(true);
    const connectionIds = Array.from(new Set([
      ...friendsList.map((f) => f.uid),
      ...followingList.map((f) => f.uid),
    ]));

    const unsubFeed = subscribeToFriendsFeed(currentUser.uid, connectionIds, (posts) => {
      if (Array.isArray(posts) && posts.length > 0) {
        setFeedPosts((prev) => {
          const map = new Map<string, PostItem>();
          posts.forEach((p) => map.set(p.id, p));
          prev.forEach((p) => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
          savePostsToStorage(merged);
          return merged;
        });
      }
      setLoadingFeed(false);
    });

    return () => {
      unsubFeed();
    };
  }, [currentUser?.uid, friendsList, followingList]);

  // Handlers
  const handleFollowToggle = async (targetUser: UserProfile): Promise<RelationshipStatus> => {
    if (!currentUser) return 'none';
    if (currentUser.isGuest) {
      throw new Error('Guest users cannot follow profiles. Please create an account to connect with people!');
    }
    const status = await followUser(currentUser, targetUser);
    await refreshFriends();
    return status;
  };

  const handleUnfollow = async (targetUid: string) => {
    if (!currentUser) return;
    await unfollowUser(currentUser.uid, targetUid);
    await refreshFriends();
  };

  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      throw new Error('Guest users cannot send follow requests. Please create an account to connect with people!');
    }
    await sendFriendRequest(currentUser, targetUser);
  };

  const handleCancelRequest = async (receiverId: string) => {
    if (!currentUser) return;
    await cancelFriendRequest(currentUser.uid, receiverId);
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    await acceptFriendRequest(req, currentUser);
    await refreshFriends();
  };

  const handleRejectRequest = async (reqId: string) => {
    await rejectFriendRequest(reqId);
  };

  const handleRemoveFriend = async (targetUid: string) => {
    if (!currentUser) return;
    await removeFriend(currentUser.uid, targetUid);
    await refreshFriends();
  };

  const handleCreatePost = async (
    caption: string,
    mediaUrl?: string,
    mediaType: 'image' | 'video' | 'none' = 'none',
    audioUrl?: string,
    audioTitle?: string,
    audioArtist?: string,
    visibility: 'friends' | 'public' = 'friends',
    adjustments?: {
      audioVolume?: number;
      audioLoop?: boolean;
      audioStartOffset?: number;
      videoAspectRatio?: 'original' | '16/9' | '1/1' | '9/16' | '4/5';
      videoSpeed?: number;
      videoMuted?: boolean;
      videoVolume?: number;
      videoFilter?: 'none' | 'vibrant' | 'cinema' | 'vintage' | 'bw' | 'warm';
      videoLoop?: boolean;
    }
  ): Promise<PostItem> => {
    if (!currentUser) throw new Error('You must be logged in to create a post.');

    let newPost: PostItem;

    if (currentUser.isGuest || !isFirebaseConfigured()) {
      newPost = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorUsername: currentUser.username,
        authorPhoto: currentUser.photoURL,
        caption,
        mediaUrl,
        mediaType,
        audioUrl,
        audioTitle,
        audioArtist,
        createdAt: Date.now(),
        likes: [],
        commentsCount: 0,
        visibility,
        audioVolume: adjustments?.audioVolume ?? 80,
        audioLoop: adjustments?.audioLoop ?? true,
        audioStartOffset: adjustments?.audioStartOffset ?? 0,
        videoAspectRatio: adjustments?.videoAspectRatio ?? 'original',
        videoSpeed: adjustments?.videoSpeed ?? 1,
        videoMuted: adjustments?.videoMuted ?? false,
        videoVolume: adjustments?.videoVolume ?? 100,
        videoFilter: adjustments?.videoFilter ?? 'none',
        videoLoop: adjustments?.videoLoop ?? true,
      };
    } else {
      try {
        newPost = await createPost(
          currentUser,
          caption,
          mediaUrl,
          mediaType,
          audioUrl,
          audioTitle,
          audioArtist,
          visibility,
          adjustments
        );
      } catch (err) {
        console.warn('Firebase createPost fallback to local state:', err);
        newPost = {
          id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          authorUsername: currentUser.username,
          authorPhoto: currentUser.photoURL,
          caption,
          mediaUrl,
          mediaType,
          audioUrl,
          audioTitle,
          audioArtist,
          createdAt: Date.now(),
          likes: [],
          commentsCount: 0,
          visibility,
          audioVolume: adjustments?.audioVolume ?? 80,
          audioLoop: adjustments?.audioLoop ?? true,
          audioStartOffset: adjustments?.audioStartOffset ?? 0,
          videoAspectRatio: adjustments?.videoAspectRatio ?? 'original',
          videoSpeed: adjustments?.videoSpeed ?? 1,
          videoMuted: adjustments?.videoMuted ?? false,
          videoVolume: adjustments?.videoVolume ?? 100,
          videoFilter: adjustments?.videoFilter ?? 'none',
          videoLoop: adjustments?.videoLoop ?? true,
        };
      }
    }

    setFeedPosts((prev) => {
      const nextPosts = [newPost, ...prev.filter((p) => p.id !== newPost.id)];
      savePostsToStorage(nextPosts);
      return nextPosts;
    });

    return newPost;
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    if (!currentUser.isGuest && isFirebaseConfigured()) {
      try {
        await deletePost(postId, currentUser.uid);
      } catch {}
    }
    setFeedPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      savePostsToStorage(updated);
      return updated;
    });
  };

  const handleToggleLike = async (post: PostItem) => {
    if (!currentUser) return false;
    const alreadyLiked = post.likes.includes(currentUser.uid);
    const updatedLikes = alreadyLiked
      ? post.likes.filter((id) => id !== currentUser.uid)
      : [...post.likes, currentUser.uid];

    setFeedPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === post.id ? { ...p, likes: updatedLikes } : p
      );
      savePostsToStorage(updated);
      return updated;
    });

    if (!currentUser.isGuest && isFirebaseConfigured()) {
      try {
        await toggleLikePost(post, currentUser);
      } catch {}
    }
    return !alreadyLiked;
  };

  const handleGetComments = async (postId: string) => {
    return await getPostComments(postId);
  };

  const handleAddComment = async (post: PostItem, text: string) => {
    if (!currentUser) throw new Error('Must be logged in to comment.');

    const newComment: PostComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId: post.id,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorPhoto: currentUser.photoURL,
      text: text.trim(),
      createdAt: Date.now(),
    };

    setFeedPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === post.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
      );
      savePostsToStorage(updated);
      return updated;
    });

    if (!currentUser.isGuest && isFirebaseConfigured()) {
      try {
        await addPostComment(post, currentUser, text);
      } catch {}
    }

    return newComment;
  };

  const handleMarkNotifRead = async (notifId: string) => {
    await markNotificationAsRead(notifId);
  };

  const handleMarkAllNotifsRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsAsRead(currentUser.uid);
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <SocialContext.Provider
      value={{
        feedPosts,
        friendRequests,
        notifications,
        friendsList,
        followersList,
        followingList,
        unreadNotifsCount,
        loadingFeed,
        handleSendRequest,
        handleCancelRequest,
        handleAcceptRequest,
        handleRejectRequest,
        handleRemoveFriend,
        handleFollowToggle,
        handleUnfollow,
        handleCreatePost,
        handleDeletePost,
        handleToggleLike,
        handleGetComments,
        handleAddComment,
        handleMarkNotifRead,
        handleMarkAllNotifsRead,
        refreshFriends,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within a SocialProvider');
  return ctx;
};
