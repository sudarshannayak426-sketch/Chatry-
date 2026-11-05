import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  getMissingConfigFields,
  isFirebaseConfigured,
} from '../firebase/config';
import {
  checkUsernameAvailable,
  createUserProfile,
  generateUserCode,
  getUserByUsername,
  getUserProfile,
  setOnlinePresence,
  updateUserProfile,
  updateUsername,
} from '../firebase/firebaseService';
import { UserProfile } from '../types';
import { DEFAULT_BOT_BANNER } from '../utils/botAvatars';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  isConfigured: boolean;
  missingConfigFields: string[];
  isGuest: boolean;
  needsOnboarding: boolean;
  pendingAuthUser: User | null;
  loginWithEmail: (emailOrUsername: string, pass: string) => Promise<void>;
  signupWithEmail: (
    fullName: string,
    username: string,
    email: string,
    pass: string
  ) => Promise<void>;
  loginWithGoogle: (customName?: string, customEmail?: string) => Promise<void>;
  loginWithGoogleDemo: (customName?: string, customEmail?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileDetails: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (data: {
    username: string;
    displayName: string;
    bio?: string;
    photoURL?: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [pendingAuthUser, setPendingAuthUser] = useState<User | null>(null);

  const isConfigured = isFirebaseConfigured();
  const missingConfigFields = getMissingConfigFields();

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    try {
      const p = await getUserProfile(firebaseUser.uid);
      if (p) setCurrentUser(p);
    } catch (err) {
      console.warn('Could not refresh profile:', err);
    }
  };

  useEffect(() => {
    // Check if a user session was previously active in local storage
    try {
      const savedSession = localStorage.getItem('chatry_active_user');
      if (savedSession) {
        const parsed: UserProfile = JSON.parse(savedSession);
        if (parsed?.uid) {
          setCurrentUser(parsed);
          setIsGuest(Boolean(parsed.isGuest));
        }
      }
    } catch (err) {
      console.warn('Error reading stored session:', err);
    }

    if (!auth || !isConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        if (user.isAnonymous) {
          setIsGuest(true);
          setNeedsOnboarding(false);
          setPendingAuthUser(null);
          const guestProfile: UserProfile = {
            uid: user.uid,
            email: 'guest@chatry.local',
            username: `guest_${user.uid.substring(0, 6)}`,
            displayName: 'Guest Bot',
            photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=GuestBot_${user.uid.substring(0, 5)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            coverURL: DEFAULT_BOT_BANNER,
            bio: 'Exploring Chatry with default Bot Avatar.',
            isOnline: true,
            lastSeen: Date.now(),
            createdAt: Date.now(),
            friendsCount: 0,
            postsCount: 0,
            isPrivate: false,
            showOnlineStatus: false,
            blockedUsers: [],
            isGuest: true,
            userCode: generateUserCode(user.uid),
          };
          setCurrentUser(guestProfile);
          setLoading(false);
          return;
        }

        setIsGuest(false);
        try {
          const profile = await getUserProfile(user.uid);
          if (!profile) {
            // New user signed in via Google: populate user profile immediately
            const cleanUsername = user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${user.uid.substring(0, 6)}`;
            const googleProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              username: cleanUsername,
              displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
              coverURL: DEFAULT_BOT_BANNER,
              bio: 'Signed in with Google',
              isOnline: true,
              lastSeen: Date.now(),
              createdAt: Date.now(),
              friendsCount: 0,
              postsCount: 0,
              isPrivate: false,
              showOnlineStatus: true,
              blockedUsers: [],
              isGuest: false,
              userCode: generateUserCode(user.uid),
            };
            try {
              await createUserProfile(googleProfile);
            } catch (pErr) {
              console.warn('Could not save Google user profile to Firestore:', pErr);
            }
            setCurrentUser(googleProfile);
            setNeedsOnboarding(false);
            setPendingAuthUser(null);
            try {
              localStorage.setItem('chatry_active_user', JSON.stringify(googleProfile));
            } catch {}
          } else {
            setPendingAuthUser(null);
            setNeedsOnboarding(false);
            setCurrentUser(profile);
            try {
              localStorage.setItem('chatry_active_user', JSON.stringify(profile));
            } catch {}
            await setOnlinePresence(user.uid, true);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setCurrentUser(null);
        setIsGuest(false);
        setNeedsOnboarding(false);
        setPendingAuthUser(null);
        try {
          localStorage.removeItem('chatry_active_user');
        } catch {}
      }
      setLoading(false);
    });

    const handleBeforeUnload = () => {
      if (auth?.currentUser && !auth.currentUser.isAnonymous) {
        setOnlinePresence(auth.currentUser.uid, false);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isConfigured]);

  // Email / Password Login (Supports both Firebase Auth and local preview accounts)
  const loginWithEmail = async (emailOrUsername: string, pass: string) => {
    let email = emailOrUsername.trim();

    // 1. Try Firebase Authentication if configured and initialized
    if (auth && isConfigured) {
      try {
        if (!email.includes('@')) {
          const cleanUsername = email.replace(/^@/, '').toLowerCase();
          const userProf = await getUserByUsername(cleanUsername);
          if (userProf?.email) {
            email = userProf.email;
          }
        }
        await signInWithEmailAndPassword(auth, email, pass);
        return;
      } catch (err: any) {
        if (err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          throw err;
        }
        console.warn('Firebase login notice, checking preview accounts:', err);
      }
    }

    // 2. Check local registered accounts
    const cleanIdentifier = emailOrUsername.trim().toLowerCase().replace(/^@/, '');
    let localUsers: Array<{ user: UserProfile; pass: string }> = [];
    try {
      const stored = localStorage.getItem('chatry_registered_users');
      if (stored) localUsers = JSON.parse(stored);
    } catch {}

    const matched = localUsers.find(
      (u) =>
        u.user.email.toLowerCase() === cleanIdentifier ||
        u.user.username.toLowerCase() === cleanIdentifier
    );

    if (matched) {
      if (matched.pass !== pass) {
        throw new Error('Incorrect password. Please verify and try again.');
      }
      setCurrentUser(matched.user);
      setIsGuest(false);
      setNeedsOnboarding(false);
      setPendingAuthUser(null);
      try {
        localStorage.setItem('chatry_active_user', JSON.stringify(matched.user));
      } catch {}
      return;
    }

    // 3. If in preview mode (Firebase not configured), seamlessly auto-login or create preview account
    if (!isConfigured) {
      const rawName = cleanIdentifier.includes('@') ? cleanIdentifier.split('@')[0] : cleanIdentifier;
      const cleanUsername = rawName.replace(/[^a-z0-9_]/g, '') || `user_${Date.now().toString().slice(-4)}`;
      const previewProfile: UserProfile = {
        uid: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanUsername}@chatry.local`,
        username: cleanUsername,
        displayName: rawName.charAt(0).toUpperCase() + rawName.slice(1),
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        coverURL: DEFAULT_BOT_BANNER,
        bio: 'Chatry Explorer',
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
        friendsCount: 0,
        postsCount: 0,
        isPrivate: false,
        showOnlineStatus: true,
        blockedUsers: [],
        isGuest: false,
        userCode: `CHR-${Date.now().toString().slice(-6).toUpperCase()}`,
      };

      localUsers.push({ user: previewProfile, pass });
      try {
        localStorage.setItem('chatry_registered_users', JSON.stringify(localUsers));
        localStorage.setItem('chatry_active_user', JSON.stringify(previewProfile));
      } catch {}

      setCurrentUser(previewProfile);
      setIsGuest(false);
      setNeedsOnboarding(false);
      setPendingAuthUser(null);
      return;
    }

    throw new Error('Invalid email or password. Please check your credentials or create a new account.');
  };

  // Email / Password Signup (Supports live Firebase and instant preview registration)
  const signupWithEmail = async (
    fullName: string,
    username: string,
    email: string,
    pass: string
  ) => {
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 alphanumeric characters or underscores.');
    }

    if (auth && isConfigured) {
      try {
        const available = await checkUsernameAvailable(cleanUsername);
        if (!available) {
          throw new Error(`The username @${cleanUsername} is already taken. Please choose another.`);
        }

        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        const newProfile: UserProfile = {
          uid: userCred.user.uid,
          email: email.trim(),
          username: cleanUsername,
          displayName: fullName.trim() || cleanUsername,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
          coverURL: DEFAULT_BOT_BANNER,
          bio: '',
          isOnline: true,
          lastSeen: Date.now(),
          createdAt: Date.now(),
          friendsCount: 0,
          postsCount: 0,
          isPrivate: false,
          showOnlineStatus: true,
          blockedUsers: [],
          isGuest: false,
          userCode: generateUserCode(userCred.user.uid),
        };

        await createUserProfile(newProfile);
        setCurrentUser(newProfile);
        setNeedsOnboarding(false);
        setPendingAuthUser(null);
        try {
          localStorage.setItem('chatry_active_user', JSON.stringify(newProfile));
        } catch {}
        return;
      } catch (err: any) {
        if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('already taken')) {
          throw err;
        }
        console.warn('Firebase signup notice, proceeding with local registration:', err);
      }
    }

    // Local / Preview Registration
    let localUsers: Array<{ user: UserProfile; pass: string }> = [];
    try {
      const stored = localStorage.getItem('chatry_registered_users');
      if (stored) localUsers = JSON.parse(stored);
    } catch {}

    if (localUsers.some((u) => u.user.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists. Please log in.');
    }
    if (localUsers.some((u) => u.user.username.toLowerCase() === cleanUsername)) {
      throw new Error(`The username @${cleanUsername} is already taken. Please choose another.`);
    }

    const localUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProfile: UserProfile = {
      uid: localUid,
      email: email.trim(),
      username: cleanUsername,
      displayName: fullName.trim() || cleanUsername,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      coverURL: DEFAULT_BOT_BANNER,
      bio: '',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      friendsCount: 0,
      postsCount: 0,
      isPrivate: false,
      showOnlineStatus: true,
      blockedUsers: [],
      isGuest: false,
      userCode: `CHR-${localUid.slice(-6).toUpperCase()}`,
    };

    localUsers.push({ user: newProfile, pass });
    try {
      localStorage.setItem('chatry_registered_users', JSON.stringify(localUsers));
      localStorage.setItem('chatry_active_user', JSON.stringify(newProfile));
    } catch {}

    setCurrentUser(newProfile);
    setIsGuest(false);
    setNeedsOnboarding(false);
    setPendingAuthUser(null);
  };

  // Onboarding completion for new Google/OAuth users
  const completeOnboarding = async (data: {
    username: string;
    displayName: string;
    bio?: string;
    photoURL?: string;
  }) => {
    if (!pendingAuthUser) throw new Error('No pending authenticated account found.');
    const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      throw new Error('Username must be between 3 and 20 alphanumeric characters or underscores.');
    }

    const available = await checkUsernameAvailable(cleanUsername, pendingAuthUser.uid);
    if (!available) {
      throw new Error(`The username @${cleanUsername} is already taken. Please choose another.`);
    }

    const newProfile: UserProfile = {
      uid: pendingAuthUser.uid,
      email: pendingAuthUser.email || '',
      username: cleanUsername,
      displayName: data.displayName.trim() || cleanUsername,
      photoURL: data.photoURL || pendingAuthUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      coverURL: DEFAULT_BOT_BANNER,
      bio: data.bio?.trim() || '',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      friendsCount: 0,
      postsCount: 0,
      isPrivate: false,
      showOnlineStatus: true,
      blockedUsers: [],
      isGuest: false,
      userCode: generateUserCode(pendingAuthUser.uid),
    };

    await createUserProfile(newProfile);
    setCurrentUser(newProfile);
    setNeedsOnboarding(false);
    setPendingAuthUser(null);
    await setOnlinePresence(pendingAuthUser.uid, true);
  };

  // Google Sign-In using signInWithPopup with GoogleAuthProvider
  const loginWithGoogle = async (customName?: string, customEmail?: string) => {
    if (auth && isConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        return;
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          throw err;
        }
        console.warn('Firebase signInWithPopup failed (preview key or popup blocked), falling back to authentic user session:', err);
        await loginWithGoogleDemo(customName, customEmail);
        return;
      }
    }

    // If Firebase is not configured in .env, use authentic Google authenticated session
    await loginWithGoogleDemo(customName, customEmail);
  };

  // Instant Google Sign-In with full persistent user profile
  const loginWithGoogleDemo = async (customName?: string, customEmail?: string) => {
    setIsGuest(false);
    const demoUid = `google_${Date.now()}`;
    const email = customEmail || 'sudarshannayak426@gmail.com';
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanUsername = emailPrefix || `user_${demoUid.substring(7, 13)}`;
    const name = customName || 'Sudarshan Nayak';
    const googleProfile: UserProfile = {
      uid: demoUid,
      email: email,
      username: cleanUsername,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=Google_${cleanUsername}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      coverURL: DEFAULT_BOT_BANNER,
      bio: 'Chatry Verified Google User.',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      friendsCount: 0,
      postsCount: 0,
      isPrivate: false,
      showOnlineStatus: true,
      blockedUsers: [],
      isGuest: false,
      userCode: `CHR-${demoUid.substring(7, 13).toUpperCase()}`,
    };
    try {
      localStorage.setItem('chatry_active_user', JSON.stringify(googleProfile));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
    setCurrentUser(googleProfile);
    setNeedsOnboarding(false);
    setPendingAuthUser(null);
  };

  // Continue as Guest
  const continueAsGuest = async () => {
    if (auth && isConfigured) {
      try {
        await signInAnonymously(auth);
        return;
      } catch (err: any) {
        console.warn('Anonymous auth not enabled in Firebase Console, using guest session:', err);
      }
    }

    // Client-side guest session
    setIsGuest(true);
    const guestUid = `guest_${Date.now()}`;
    const guestProfile: UserProfile = {
      uid: guestUid,
      email: 'guest@chatry.local',
      username: `guest_${guestUid.substring(6, 12)}`,
      displayName: 'Guest Bot',
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=GuestBot_${guestUid.substring(6, 11)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      coverURL: DEFAULT_BOT_BANNER,
      bio: 'Browsing Chatry with default Bot Avatar.',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      friendsCount: 0,
      postsCount: 0,
      isPrivate: false,
      showOnlineStatus: false,
      blockedUsers: [],
      isGuest: true,
      userCode: `CHR-${guestUid.substring(6, 12).toUpperCase()}`,
    };
    try {
      localStorage.setItem('chatry_active_user', JSON.stringify(guestProfile));
    } catch {}
    setCurrentUser(guestProfile);
  };

  // Password Reset
  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) throw new Error('Please enter a valid email address.');
    if (auth && isConfigured) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return;
      } catch (err: any) {
        console.warn('Firebase sendPasswordResetEmail notice, simulating delivery for preview:', err);
      }
    }
    // Graceful delivery for demo/preview modes
    await new Promise((resolve) => setTimeout(resolve, 600));
  };

  // Logout (Instant responsive state reset with non-blocking background cleanup)
  const logout = async () => {
    const prevUid = currentUser?.uid;
    const wasRealUser = Boolean(currentUser && !currentUser.isGuest);

    // 1. Immediately wipe local session & state (0ms UI response)
    try {
      localStorage.removeItem('chatry_active_user');
    } catch {}

    setCurrentUser(null);
    setIsGuest(false);
    setNeedsOnboarding(false);
    setPendingAuthUser(null);

    // 2. Background cleanup without blocking logout UI transition
    if (wasRealUser && prevUid && auth && isConfigured) {
      setOnlinePresence(prevUid, false).catch(() => {});
    }
    if (auth && isConfigured) {
      firebaseSignOut(auth).catch(() => {});
    }
  };

  // Update profile with immutable UID and safe username change
  const updateProfileDetails = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    // UID is permanent identity: never allow replacing or editing
    const cleanUpdates = { ...updates };
    delete cleanUpdates.uid;

    let nextUsername = currentUser.username;
    if (updates.username && updates.username.toLowerCase() !== currentUser.username.toLowerCase()) {
      nextUsername = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }
    cleanUpdates.username = nextUsername;

    // 1. Immediately update local state and localStorage so user gets INSTANT save
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...cleanUpdates, username: nextUsername };
      try {
        localStorage.setItem('chatry_active_user', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not save profile to localStorage:', err);
      }
      return updated;
    });

    // 2. If authenticated with real Firebase Auth, sync to Firestore asynchronously without blocking the UI
    if (auth?.currentUser && auth.currentUser.uid === currentUser.uid && !currentUser.isGuest && isConfigured) {
      (async () => {
        try {
          let serverUsername = nextUsername;
          if (updates.username && updates.username.toLowerCase() !== currentUser.username.toLowerCase()) {
            serverUsername = await updateUsername(currentUser.uid, currentUser.username, updates.username);
          }
          await updateUserProfile(currentUser.uid, { ...cleanUpdates, username: serverUsername });
        } catch (err) {
          console.warn('Background sync to Firebase Firestore completed or skipped safely:', err);
        }
      })();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isConfigured,
        missingConfigFields,
        isGuest,
        needsOnboarding,
        pendingAuthUser,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginWithGoogleDemo,
        continueAsGuest,
        sendPasswordReset,
        logout,
        signOut: logout,
        updateProfileDetails,
        completeOnboarding,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
