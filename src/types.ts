export type RelationshipStatus =
  | 'none'
  | 'following'
  | 'followed_by'
  | 'friends'
  | 'request_sent'
  | 'request_received';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
  friendsCount: number;
  followersCount?: number;
  followingCount?: number;
  postsCount: number;
  isPrivate: boolean;
  showOnlineStatus: boolean;
  blockedUsers: string[];
  isGuest?: boolean;
  userCode?: string;
  coverURL?: string; // bot_cyber | whatsapp_clean | custom URL
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhoto: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface FriendRelation {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: number;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  caption: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'none';
  audioUrl?: string;
  audioTitle?: string;
  audioArtist?: string;
  likes: string[]; // user UIDs
  commentsCount: number;
  createdAt: number;
  visibility: 'friends' | 'public';
  // Music & Video Adjustments
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

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails?: Record<string, {
    displayName: string;
    username: string;
    photoURL: string;
    isOnline?: boolean;
    lastSeen?: number;
  }>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
    mediaType?: 'text' | 'image' | 'video';
  };
  unreadCounts: Record<string, number>;
  updatedAt: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
  readBy: string[];
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhoto: string;
  type: 'friend_request' | 'friend_accepted' | 'new_message' | 'post_like' | 'post_comment';
  message: string;
  read: boolean;
  createdAt: number;
  targetId?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  duration: string;
  genre: string;
  license: string;
}

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}
