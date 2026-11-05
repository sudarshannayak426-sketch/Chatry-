import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ChatMessage,
  Conversation,
  FriendRelation,
  FriendRequest,
  NotificationItem,
  PostComment,
  PostItem,
  RelationshipStatus,
  UserProfile,
} from '../types';
import { db, isFirebaseConfigured } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';

function ensureDb() {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not configured. Please enter your Firebase settings.');
  }
  return db;
}

// ======================== USER PROFILES ========================

export function generateUserCode(uid: string): string {
  const clean = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = clean.length >= 6 ? clean.substring(0, 6) : (clean + '987654').substring(0, 6);
  return `CHR-${suffix}`;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const database = ensureDb();
  try {
    const snap = await getDoc(doc(database, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const database = ensureDb();
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanUsername) return null;

  try {
    const nameSnap = await getDoc(doc(database, 'usernames', cleanUsername));
    if (!nameSnap.exists()) return null;
    const uid = nameSnap.data()?.uid;
    if (!uid) return null;
    return await getUserProfile(uid);
  } catch {
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const database = ensureDb();
  const cleanUsername = profile.username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    throw new Error('Username must be between 3 and 20 alphanumeric characters or underscores.');
  }

  const userCode = profile.userCode || generateUserCode(profile.uid);

  try {
    await runTransaction(database, async (transaction) => {
      const usernameRef = doc(database, 'usernames', cleanUsername);
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        const existingData = usernameSnap.data();
        if (existingData?.uid !== profile.uid) {
          throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
        }
      }

      const userRef = doc(database, 'users', profile.uid);
      transaction.set(userRef, {
        ...profile,
        username: cleanUsername,
        userCode,
      });

      transaction.set(usernameRef, {
        uid: profile.uid,
        username: cleanUsername,
        createdAt: Date.now(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('already taken')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `users/${profile.uid}`);
  }
}

export async function checkUsernameAvailable(username: string, currentUid?: string): Promise<boolean> {
  const database = ensureDb();
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20) return false;
  try {
    const snap = await getDoc(doc(database, 'usernames', cleanUsername));
    if (!snap.exists()) return true;
    if (currentUid && snap.data()?.uid === currentUid) return true;
    return false;
  } catch {
    return true;
  }
}

export async function updateUsername(
  uid: string,
  oldUsername: string,
  newUsername: string
): Promise<string> {
  const database = ensureDb();
  const cleanNew = newUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cleanOld = oldUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (cleanNew.length < 3 || cleanNew.length > 20) {
    throw new Error('Username must be between 3 and 20 characters (letters, numbers, underscore).');
  }

  if (cleanNew === cleanOld) {
    return cleanOld;
  }

  try {
    await runTransaction(database, async (transaction) => {
      const newUsernameRef = doc(database, 'usernames', cleanNew);
      const newUsernameSnap = await transaction.get(newUsernameRef);
      if (newUsernameSnap.exists()) {
        const existing = newUsernameSnap.data();
        if (existing?.uid !== uid) {
          throw new Error(`Username @${cleanNew} is already taken. Please choose another.`);
        }
      }

      const userRef = doc(database, 'users', uid);
      transaction.update(userRef, {
        username: cleanNew,
        updatedAt: Date.now(),
      });

      transaction.set(newUsernameRef, {
        uid,
        username: cleanNew,
        createdAt: Date.now(),
      });

      if (cleanOld && cleanOld !== cleanNew) {
        const oldUsernameRef = doc(database, 'usernames', cleanOld);
        transaction.delete(oldUsernameRef);
      }
    });

    return cleanNew;
  } catch (err) {
    if (err instanceof Error && err.message.includes('already taken')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/username`);
    return cleanOld;
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const database = ensureDb();
  try {
    await updateDoc(doc(database, 'users', uid), {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function setOnlinePresence(uid: string, isOnline: boolean): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      isOnline,
      lastSeen: Date.now(),
    });
  } catch {
    // Silent fail for tab unload / heartbeat
  }
}

export async function searchUsers(searchTerm: string, currentUid?: string): Promise<UserProfile[]> {
  const database = ensureDb();
  const raw = searchTerm.trim();
  const term = raw.toLowerCase().replace(/^@/, '');

  try {
    // 1. Search by exact UID match if query is long
    if (term.length >= 15) {
      const directDoc = await getDoc(doc(database, 'users', term));
      if (directDoc.exists()) {
        const u = directDoc.data() as UserProfile;
        return u.uid !== currentUid ? [u] : [];
      }
    }

    // 2. Search by UserCode exact match (e.g. "CHR-8F2B1A")
    if (raw.toUpperCase().startsWith('CHR-') || raw.length === 10) {
      const codeQuery = query(
        collection(database, 'users'),
        where('userCode', '==', raw.toUpperCase()),
        limit(5)
      );
      const codeSnap = await getDocs(codeQuery);
      if (!codeSnap.empty) {
        const matched: UserProfile[] = [];
        codeSnap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u.uid !== currentUid) matched.push(u);
        });
        if (matched.length > 0) return matched;
      }
    }

    // 3. Query users by username prefix or limit 30 for suggestions
    let q;
    if (term) {
      q = query(
        collection(database, 'users'),
        where('username', '>=', term),
        where('username', '<=', term + '\uf8ff'),
        limit(20)
      );
    } else {
      q = query(collection(database, 'users'), limit(30));
    }

    const snap = await getDocs(q);
    const usersMap = new Map<string, UserProfile>();
    snap.forEach((d) => {
      const u = d.data() as UserProfile;
      if (u.uid !== currentUid) {
        usersMap.set(u.uid, u);
      }
    });

    // 4. Fallback filter by display name, bio or userCode if searching
    if (term && usersMap.size < 5) {
      const allSnap = await getDocs(query(collection(database, 'users'), limit(50)));
      allSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.uid !== currentUid && !usersMap.has(u.uid)) {
          if (
            u.displayName?.toLowerCase().includes(term) ||
            u.bio?.toLowerCase().includes(term) ||
            u.userCode?.toLowerCase().includes(term)
          ) {
            usersMap.set(u.uid, u);
          }
        }
      });
    }

    return Array.from(usersMap.values());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

// ======================== FRIENDS, FOLLOWS & REQUESTS ========================

export async function getRelationshipStatus(
  currentUid: string,
  targetUid: string
): Promise<RelationshipStatus> {
  const database = ensureDb();
  try {
    // 1. Check if already mutual friends via friends collection
    const relationId = [currentUid, targetUid].sort().join('_');
    const friendSnap = await getDoc(doc(database, 'friends', relationId));
    if (friendSnap.exists()) {
      return 'friends';
    }

    // 2. Check follow records in follows collection
    const myFollowDoc = await getDoc(doc(database, 'follows', `${currentUid}_${targetUid}`));
    const theirFollowDoc = await getDoc(doc(database, 'follows', `${targetUid}_${currentUid}`));

    const iFollowThem = myFollowDoc.exists();
    const theyFollowMe = theirFollowDoc.exists();

    if (iFollowThem && theyFollowMe) {
      return 'friends';
    }
    if (iFollowThem) {
      return 'following';
    }
    if (theyFollowMe) {
      return 'followed_by';
    }

    // 3. Check sent pending request
    const sentQ = query(
      collection(database, 'friend_requests'),
      where('senderId', '==', currentUid),
      where('receiverId', '==', targetUid),
      where('status', '==', 'pending')
    );
    const sentSnap = await getDocs(sentQ);
    if (!sentSnap.empty) {
      return 'request_sent';
    }

    // 4. Check received pending request
    const recvQ = query(
      collection(database, 'friend_requests'),
      where('senderId', '==', targetUid),
      where('receiverId', '==', currentUid),
      where('status', '==', 'pending')
    );
    const recvSnap = await getDocs(recvQ);
    if (!recvSnap.empty) {
      return 'request_received';
    }

    return 'none';
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'friends/status');
    return 'none';
  }
}

// Backward-compatible alias
export const getFriendshipStatus = getRelationshipStatus;

export async function sendFriendRequest(
  sender: UserProfile,
  targetUser: UserProfile
): Promise<string> {
  const database = ensureDb();
  const reqId = `freq_${sender.uid}_${targetUser.uid}`;

  try {
    const newReq: FriendRequest = {
      id: reqId,
      senderId: sender.uid,
      senderName: sender.displayName,
      senderUsername: sender.username,
      senderPhoto: sender.photoURL,
      receiverId: targetUser.uid,
      status: 'pending',
      createdAt: Date.now(),
    };

    await setDoc(doc(database, 'friend_requests', reqId), newReq);

    // Send notification to target user
    const notifRef = doc(collection(database, 'notifications'));
    const notif: NotificationItem = {
      id: notifRef.id,
      recipientId: targetUser.uid,
      senderId: sender.uid,
      senderName: sender.displayName,
      senderUsername: sender.username,
      senderPhoto: sender.photoURL,
      type: 'friend_request',
      message: 'sent you a friend request.',
      read: false,
      createdAt: Date.now(),
      targetId: reqId,
    };
    await setDoc(notifRef, notif);

    return reqId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `friend_requests/${reqId}`);
  }
}

export async function cancelFriendRequest(senderId: string, receiverId: string): Promise<void> {
  const database = ensureDb();
  const reqId = `freq_${senderId}_${receiverId}`;
  try {
    await deleteDoc(doc(database, 'friend_requests', reqId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friend_requests/${reqId}`);
  }
}

export async function acceptFriendRequest(
  request: FriendRequest,
  currentUser: UserProfile
): Promise<void> {
  const database = ensureDb();
  const relationId = [request.senderId, currentUser.uid].sort().join('_');

  try {
    const batch = writeBatch(database);

    // 1. Create friendship doc
    const friendRef = doc(database, 'friends', relationId);
    batch.set(friendRef, {
      id: relationId,
      user1Id: request.senderId,
      user2Id: currentUser.uid,
      createdAt: Date.now(),
    });

    // 2. Delete the friend request
    const reqRef = doc(database, 'friend_requests', request.id);
    batch.delete(reqRef);

    // 3. Increment friends count on both users
    const user1Ref = doc(database, 'users', request.senderId);
    const user2Ref = doc(database, 'users', currentUser.uid);
    batch.update(user1Ref, { friendsCount: increment(1) });
    batch.update(user2Ref, { friendsCount: increment(1) });

    // 4. Send notification to request sender
    const notifRef = doc(collection(database, 'notifications'));
    batch.set(notifRef, {
      id: notifRef.id,
      recipientId: request.senderId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderUsername: currentUser.username,
      senderPhoto: currentUser.photoURL,
      type: 'friend_accepted',
      message: 'accepted your friend request. You can now chat and see each other\'s posts!',
      read: false,
      createdAt: Date.now(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `friends/${relationId}`);
  }
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const database = ensureDb();
  try {
    await deleteDoc(doc(database, 'friend_requests', requestId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friend_requests/${requestId}`);
  }
}

export async function removeFriend(currentUid: string, targetUid: string): Promise<void> {
  const database = ensureDb();
  const relationId = [currentUid, targetUid].sort().join('_');

  try {
    const batch = writeBatch(database);
    batch.delete(doc(database, 'friends', relationId));
    batch.delete(doc(database, 'follows', `${currentUid}_${targetUid}`));
    batch.delete(doc(database, 'follows', `${targetUid}_${currentUid}`));
    batch.update(doc(database, 'users', currentUid), { friendsCount: increment(-1) });
    batch.update(doc(database, 'users', targetUid), { friendsCount: increment(-1) });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friends/${relationId}`);
  }
}

export async function followUser(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<RelationshipStatus> {
  const database = ensureDb();
  if (currentUser.uid === targetUser.uid) {
    throw new Error('You cannot follow yourself.');
  }

  // 1. If target user has a private account, send follow request
  if (targetUser.isPrivate) {
    await sendFriendRequest(currentUser, targetUser);
    return 'request_sent';
  }

  // 2. Direct follow: create follow record
  const followId = `${currentUser.uid}_${targetUser.uid}`;
  const batch = writeBatch(database);
  batch.set(doc(database, 'follows', followId), {
    id: followId,
    followerId: currentUser.uid,
    followingId: targetUser.uid,
    createdAt: Date.now(),
  });

  batch.update(doc(database, 'users', currentUser.uid), {
    followingCount: increment(1),
  });
  batch.update(doc(database, 'users', targetUser.uid), {
    friendsCount: increment(1),
  });

  // 3. Check if target user is also following current user (Mutual follow / Friends)
  const reverseDoc = await getDoc(doc(database, 'follows', `${targetUser.uid}_${currentUser.uid}`));
  const isMutual = reverseDoc.exists();

  if (isMutual) {
    const relationId = [currentUser.uid, targetUser.uid].sort().join('_');
    batch.set(doc(database, 'friends', relationId), {
      id: relationId,
      user1Id: currentUser.uid,
      user2Id: targetUser.uid,
      createdAt: Date.now(),
    });
  }

  // Notification for targetUser
  const notifRef = doc(collection(database, 'notifications'));
  batch.set(notifRef, {
    id: notifRef.id,
    recipientId: targetUser.uid,
    senderId: currentUser.uid,
    senderName: currentUser.displayName,
    senderUsername: currentUser.username,
    senderPhoto: currentUser.photoURL,
    type: isMutual ? 'friend_accepted' : 'friend_request',
    message: isMutual
      ? 'followed you back! You are now mutual friends.'
      : 'started following you.',
    read: false,
    createdAt: Date.now(),
  });

  await batch.commit();
  return isMutual ? 'friends' : 'following';
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  const database = ensureDb();
  const followId = `${currentUid}_${targetUid}`;
  const relationId = [currentUid, targetUid].sort().join('_');

  try {
    const batch = writeBatch(database);
    batch.delete(doc(database, 'follows', followId));
    batch.delete(doc(database, 'friends', relationId));
    batch.update(doc(database, 'users', currentUid), { followingCount: increment(-1) });
    batch.update(doc(database, 'users', targetUid), { friendsCount: increment(-1) });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `follows/${followId}`);
  }
}

export async function getFollowersList(uid: string): Promise<UserProfile[]> {
  const database = ensureDb();
  try {
    const q = query(collection(database, 'follows'), where('followingId', '==', uid));
    const snap = await getDocs(q);
    const followerIds: string[] = [];
    snap.forEach((d) => {
      followerIds.push(d.data().followerId);
    });

    const friends = await getFriendsList(uid);
    const set = new Set([...followerIds, ...friends.map((f) => f.uid)]);
    if (set.size === 0) return [];

    const profiles = await Promise.all(Array.from(set).map((id) => getUserProfile(id)));
    return profiles.filter((p): p is UserProfile => p !== null);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'follows');
    return [];
  }
}

export async function getFollowingList(uid: string): Promise<UserProfile[]> {
  const database = ensureDb();
  try {
    const q = query(collection(database, 'follows'), where('followerId', '==', uid));
    const snap = await getDocs(q);
    const followingIds: string[] = [];
    snap.forEach((d) => {
      followingIds.push(d.data().followingId);
    });

    const friends = await getFriendsList(uid);
    const set = new Set([...followingIds, ...friends.map((f) => f.uid)]);
    if (set.size === 0) return [];

    const profiles = await Promise.all(Array.from(set).map((id) => getUserProfile(id)));
    return profiles.filter((p): p is UserProfile => p !== null);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'follows');
    return [];
  }
}

export function subscribeToFriendRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void
) {
  if (!db || !isFirebaseConfigured()) return () => {};

  const q = query(
    collection(db, 'friend_requests'),
    where('receiverId', '==', uid),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as FriendRequest);
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'friend_requests');
    }
  );
}

export async function getFriendsList(uid: string): Promise<UserProfile[]> {
  const database = ensureDb();
  try {
    // Query friendships where user1Id == uid
    const q1 = query(collection(database, 'friends'), where('user1Id', '==', uid));
    const q2 = query(collection(database, 'friends'), where('user2Id', '==', uid));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const friendUids: string[] = [];

    snap1.forEach((d) => {
      const r = d.data() as FriendRelation;
      friendUids.push(r.user2Id);
    });
    snap2.forEach((d) => {
      const r = d.data() as FriendRelation;
      friendUids.push(r.user1Id);
    });

    if (friendUids.length === 0) return [];

    const profiles = await Promise.all(friendUids.map((id) => getUserProfile(id)));
    return profiles.filter((p): p is UserProfile => p !== null);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'friends');
  }
}

// ======================== HOME FEED & POSTS ========================

export function subscribeToFriendsFeed(
  currentUid: string,
  friendUids: string[],
  callback: (posts: PostItem[]) => void
) {
  if (!db || !isFirebaseConfigured()) return () => {};

  // Feed includes own posts and friends' posts
  const allowedAuthors = [currentUid, ...friendUids].slice(0, 30); // Firestore max 30 in 'in' queries

  const q = query(
    collection(db, 'posts'),
    where('authorId', 'in', allowedAuthors),
    orderBy('createdAt', 'desc'),
    limit(40)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs.map((d) => d.data() as PostItem);
      callback(posts);
    },
    (err) => {
      // If composite index is building or permissions, gracefully log
      console.warn('Friends feed snapshot notice:', err);
    }
  );
}

export async function getUserPosts(authorUid: string): Promise<PostItem[]> {
  const database = ensureDb();
  try {
    const q = query(
      collection(database, 'posts'),
      where('authorId', '==', authorUid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PostItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `posts/user_${authorUid}`);
  }
}

export async function createPost(
  author: UserProfile,
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
): Promise<PostItem> {
  const generatedId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newPost: PostItem = {
    id: generatedId,
    authorId: author.uid,
    authorName: author.displayName,
    authorUsername: author.username,
    authorPhoto: author.photoURL,
    caption,
    mediaUrl,
    mediaType,
    audioUrl,
    audioTitle,
    audioArtist,
    likes: [],
    commentsCount: 0,
    createdAt: Date.now(),
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

  if (!db || !isFirebaseConfigured()) {
    return newPost;
  }

  try {
    const postRef = doc(db, 'posts', generatedId);
    const batch = writeBatch(db);
    batch.set(postRef, newPost);
    batch.update(doc(db, 'users', author.uid), {
      postsCount: increment(1),
    });
    await batch.commit();
    return newPost;
  } catch (err) {
    console.warn('Firebase createPost fallback to local object:', err);
    return newPost;
  }
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  const database = ensureDb();
  try {
    const batch = writeBatch(database);
    batch.delete(doc(database, 'posts', postId));
    batch.update(doc(database, 'users', authorId), {
      postsCount: increment(-1),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
  }
}

export async function toggleLikePost(
  post: PostItem,
  user: UserProfile
): Promise<boolean> {
  const database = ensureDb();
  const isLiked = post.likes.includes(user.uid);

  try {
    const postRef = doc(database, 'posts', post.id);
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });

    // Notify author if newly liked and not self
    if (!isLiked && post.authorId !== user.uid) {
      const notifRef = doc(collection(database, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        recipientId: post.authorId,
        senderId: user.uid,
        senderName: user.displayName,
        senderUsername: user.username,
        senderPhoto: user.photoURL,
        type: 'post_like',
        message: 'liked your post.',
        read: false,
        createdAt: Date.now(),
        targetId: post.id,
      });
    }

    return !isLiked;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
  }
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const database = ensureDb();
  try {
    const q = query(
      collection(database, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PostComment);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `posts/${postId}/comments`);
  }
}

export async function addPostComment(
  post: PostItem,
  user: UserProfile,
  text: string
): Promise<PostComment> {
  const database = ensureDb();
  const commentRef = doc(collection(database, 'posts', post.id, 'comments'));

  try {
    const comment: PostComment = {
      id: commentRef.id,
      postId: post.id,
      authorId: user.uid,
      authorName: user.displayName,
      authorUsername: user.username,
      authorPhoto: user.photoURL,
      text,
      createdAt: Date.now(),
    };

    const batch = writeBatch(database);
    batch.set(commentRef, comment);
    batch.update(doc(database, 'posts', post.id), {
      commentsCount: increment(1),
    });

    if (post.authorId !== user.uid) {
      const notifRef = doc(collection(database, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        recipientId: post.authorId,
        senderId: user.uid,
        senderName: user.displayName,
        senderUsername: user.username,
        senderPhoto: user.photoURL,
        type: 'post_comment',
        message: `commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        read: false,
        createdAt: Date.now(),
        targetId: post.id,
      });
    }

    await batch.commit();
    return comment;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}/comments/${commentRef.id}`);
  }
}

// ======================== REAL-TIME MESSAGING ========================

export async function getOrCreateConversation(
  userA: UserProfile,
  userB: UserProfile
): Promise<Conversation> {
  const database = ensureDb();
  const convId = `conv_${[userA.uid, userB.uid].sort().join('_')}`;
  const convRef = doc(database, 'conversations', convId);

  try {
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      return snap.data() as Conversation;
    }

    const newConv: Conversation = {
      id: convId,
      participants: [userA.uid, userB.uid],
      participantDetails: {
        [userA.uid]: {
          displayName: userA.displayName,
          username: userA.username,
          photoURL: userA.photoURL,
          isOnline: userA.isOnline,
        },
        [userB.uid]: {
          displayName: userB.displayName,
          username: userB.username,
          photoURL: userB.photoURL,
          isOnline: userB.isOnline,
        },
      },
      unreadCounts: {
        [userA.uid]: 0,
        [userB.uid]: 0,
      },
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    await setDoc(convRef, newConv);
    return newConv;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
  }
}

export function subscribeToConversations(
  uid: string,
  callback: (conversations: Conversation[]) => void
) {
  if (!db || !isFirebaseConfigured()) return () => {};

  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Conversation);
      callback(list);
    },
    (err) => {
      console.warn('Conversations listener error:', err);
    }
  );
}

export function subscribeToMessages(
  convId: string,
  callback: (messages: ChatMessage[]) => void
) {
  if (!db || !isFirebaseConfigured()) return () => {};

  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => d.data() as ChatMessage);
      callback(messages);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${convId}/messages`);
    }
  );
}

export async function sendChatMessage(
  conversationId: string,
  sender: UserProfile,
  recipientId: string,
  text: string,
  mediaUrl?: string,
  mediaType: 'image' | 'video' = 'image'
): Promise<ChatMessage> {
  const database = ensureDb();
  const msgRef = doc(collection(database, 'conversations', conversationId, 'messages'));

  try {
    const newMsg: ChatMessage = {
      id: msgRef.id,
      conversationId,
      senderId: sender.uid,
      senderName: sender.displayName,
      senderPhoto: sender.photoURL,
      text,
      mediaUrl,
      mediaType: mediaUrl ? mediaType : undefined,
      timestamp: Date.now(),
      readBy: [sender.uid],
    };

    const batch = writeBatch(database);
    batch.set(msgRef, newMsg);

    // Update conversation lastMessage & increment unread count for recipient
    const convRef = doc(database, 'conversations', conversationId);
    batch.update(convRef, {
      lastMessage: {
        text: mediaUrl && !text ? `📷 Sent a ${mediaType}` : text,
        senderId: sender.uid,
        timestamp: Date.now(),
        mediaType: mediaUrl ? mediaType : 'text',
      },
      updatedAt: Date.now(),
      [`unreadCounts.${recipientId}`]: increment(1),
    });

    // Send push / in-app notification to recipient
    const notifRef = doc(collection(database, 'notifications'));
    batch.set(notifRef, {
      id: notifRef.id,
      recipientId,
      senderId: sender.uid,
      senderName: sender.displayName,
      senderUsername: sender.username,
      senderPhoto: sender.photoURL,
      type: 'new_message',
      message: `sent you a message: "${text.substring(0, 32)}${text.length > 32 ? '...' : ''}"`,
      read: false,
      createdAt: Date.now(),
      targetId: conversationId,
    });

    await batch.commit();
    return newMsg;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${conversationId}/messages`);
  }
}

export async function markConversationAsRead(
  conversationId: string,
  currentUid: string
): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCounts.${currentUid}`]: 0,
    });
  } catch {
    // Non-critical
  }
}

// ======================== NOTIFICATIONS ========================

export function subscribeToNotifications(
  uid: string,
  callback: (notifications: NotificationItem[]) => void
) {
  if (!db || !isFirebaseConfigured()) return () => {};

  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(40)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as NotificationItem);
      callback(list);
    },
    (err) => {
      console.warn('Notifications snapshot notice:', err);
    }
  );
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const database = ensureDb();
  try {
    await updateDoc(doc(database, 'notifications', notifId), {
      read: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

export async function markAllNotificationsAsRead(uid: string): Promise<void> {
  const database = ensureDb();
  try {
    const q = query(
      collection(database, 'notifications'),
      where('recipientId', '==', uid),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(database);
    snap.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

// ======================== BLOCK / REPORT ========================

export async function toggleBlockUser(
  currentUid: string,
  targetUid: string
): Promise<boolean> {
  const database = ensureDb();
  const user = await getUserProfile(currentUid);
  if (!user) return false;

  const blocked = user.blockedUsers || [];
  const isBlocked = blocked.includes(targetUid);
  const nextBlocked = isBlocked
    ? blocked.filter((id) => id !== targetUid)
    : [...blocked, targetUid];

  await updateUserProfile(currentUid, { blockedUsers: nextBlocked });
  return !isBlocked;
}

export async function submitUserReport(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details: string
): Promise<void> {
  const database = ensureDb();
  const reportRef = doc(collection(database, 'reports'));
  try {
    await setDoc(reportRef, {
      id: reportRef.id,
      reporterId,
      reportedUserId,
      reason,
      details,
      createdAt: Date.now(),
      status: 'pending',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reports/${reportRef.id}`);
  }
}
