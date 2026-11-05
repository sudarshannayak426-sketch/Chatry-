import React, { useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { BlockedUsersScreen } from './components/BlockedUsersScreen';
import { BottomNav, MainTab } from './components/BottomNav';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { CreatePostModal } from './components/CreatePostModal';
import { EditProfileModal } from './components/EditProfileModal';
import { FirebaseBanner } from './components/FirebaseBanner';
import { FirebaseSetupModal } from './components/FirebaseSetupModal';
import { FriendsModal } from './components/FriendsModal';
import { FriendRequestsScreen } from './components/FriendRequestsScreen';
import { HeroLanding } from './components/HeroLanding';
import { HomeFeed } from './components/HomeFeed';
import { Navbar } from './components/Navbar';
import { NotificationsModal } from './components/NotificationsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { ProfileScreen } from './components/ProfileScreen';
import { SearchUsersScreen } from './components/SearchUsersScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { useAuth } from './context/AuthContext';
import { useChat } from './context/ChatContext';
import { getUserProfile } from './firebase/firebaseService';
import { UserProfile } from './types';

export default function App() {
  const { currentUser, loading, isGuest, needsOnboarding } = useAuth();
  const { activeConversation, closeActiveChat } = useChat();

  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [subView, setSubView] = useState<'none' | 'settings' | 'friend_requests' | 'blocked_users'>('none');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [firebaseSetupOpen, setFirebaseSetupOpen] = useState(false);

  // Dynamic user inspection
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [friendsModalTab, setFriendsModalTab] = useState<'friends' | 'following' | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 animate-bounce mb-3">
          <div className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-white animate-pulse [animation-delay:0.2s]" />
            <span className="h-2 w-2 rounded-full bg-white animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Loading Chatry...</p>
      </div>
    );
  }

  // Real onboarding for new users
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <OnboardingModal />
      </div>
    );
  }

  // If user is not authenticated and not continuing as guest, show the Hero Splash Screen (Screen 1)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar
          onOpenSearch={() => setAuthModalOpen(true)}
          onOpenNotifications={() => setAuthModalOpen(true)}
          onOpenFriendRequests={() => setAuthModalOpen(true)}
          onOpenProfile={() => setAuthModalOpen(true)}
          onOpenSettings={() => setAuthModalOpen(true)}
          onOpenFirebaseConfig={() => setFirebaseSetupOpen(true)}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
        <FirebaseBanner onOpenConfig={() => setFirebaseSetupOpen(true)} />
        <HeroLanding
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenFirebaseConfig={() => setFirebaseSetupOpen(true)}
        />
        {authModalOpen && (
          <AuthModal
            onClose={() => setAuthModalOpen(false)}
            onOpenFirebaseConfig={() => setFirebaseSetupOpen(true)}
          />
        )}
        {firebaseSetupOpen && (
          <FirebaseSetupModal onClose={() => setFirebaseSetupOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Firebase Configuration Alert if missing */}
      <FirebaseBanner onOpenConfig={() => setFirebaseSetupOpen(true)} />

      {/* Main Navbar */}
      <Navbar
        onOpenSearch={() => {
          setSubView('none');
          setInspectedUser(null);
          setCurrentTab('search');
        }}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenFriendRequests={() => {
          setSubView('friend_requests');
        }}
        onOpenProfile={() => {
          setSubView('none');
          setInspectedUser(null);
          setCurrentTab('profile');
        }}
        onOpenSettings={() => {
          setSubView('settings');
        }}
        onOpenFirebaseConfig={() => setFirebaseSetupOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20">
        {/* SUBVIEWS */}
        {subView === 'settings' ? (
          <SettingsScreen
            onBack={() => setSubView('none')}
            onOpenEditProfile={() => setEditProfileOpen(true)}
            onOpenPrivacy={() => setPrivacyModalOpen(true)}
            onOpenBlockedUsers={() => setSubView('blocked_users')}
            onOpenFirebaseConfig={() => setFirebaseSetupOpen(true)}
          />
        ) : subView === 'friend_requests' ? (
          <FriendRequestsScreen
            onBack={() => setSubView('none')}
            onViewUserProfile={async (uid) => {
              const u = await getUserProfile(uid);
              if (u) {
                setInspectedUser(u);
                setSubView('none');
              }
            }}
          />
        ) : subView === 'blocked_users' ? (
          <BlockedUsersScreen
            onBack={() => setSubView('settings')}
            onOpenSearch={() => {
              setSubView('none');
              setCurrentTab('search');
            }}
          />
        ) : inspectedUser ? (
          /* Inspecting another user's profile */
          <ProfileScreen
            user={inspectedUser}
            onBack={() => setInspectedUser(null)}
            onOpenEditProfile={() => setEditProfileOpen(true)}
            onOpenSettings={() => setSubView('settings')}
            onOpenFriendsModal={(tab) => setFriendsModalTab(tab)}
            onViewUserProfile={(u) => setInspectedUser(u)}
          />
        ) : (
          /* TAB VIEWS */
          <>
            {/* 1. HOME TAB */}
            {currentTab === 'home' && (
              <HomeFeed
                onOpenCreatePost={() => setCreatePostOpen(true)}
                onOpenSearch={() => setCurrentTab('search')}
                onViewUserProfile={(u) => setInspectedUser(u)}
              />
            )}

            {/* 2. SEARCH TAB */}
            {currentTab === 'search' && (
              <SearchUsersScreen
                onViewUserProfile={(u) => setInspectedUser(u)}
              />
            )}

            {/* 3. CHATS TAB */}
            {currentTab === 'chats' && (
              <div className="h-[calc(100vh-125px)] flex">
                <div
                  className={`w-full ${
                    activeConversation ? 'hidden md:flex md:w-80 border-r border-slate-800' : 'flex'
                  }`}
                >
                  <ChatList
                    onStartNewChat={() => setCurrentTab('search')}
                    onViewUserProfile={(u) => setInspectedUser(u)}
                  />
                </div>

                <div
                  className={`flex-1 ${
                    activeConversation ? 'flex' : 'hidden md:flex items-center justify-center bg-slate-900/40 text-slate-500'
                  }`}
                >
                  {activeConversation ? (
                    <ChatRoom
                      onBack={closeActiveChat}
                      onViewUserProfile={(u) => setInspectedUser(u)}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-sm font-semibold text-slate-300">Select a chat to begin messaging</p>
                      <p className="text-xs text-slate-500 mt-1">Real-time one-to-one chats with accepted friends</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. CURRENT USER PROFILE TAB */}
            {currentTab === 'profile' && currentUser && (
              <ProfileScreen
                user={currentUser}
                onOpenEditProfile={() => setEditProfileOpen(true)}
                onOpenSettings={() => setSubView('settings')}
                onOpenFriendsModal={(tab) => setFriendsModalTab(tab)}
                onViewUserProfile={(u) => setInspectedUser(u)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation matching mockup */}
      <BottomNav
        currentTab={currentTab}
        onTabSelect={(tab) => {
          setSubView('none');
          setInspectedUser(null);
          setCurrentTab(tab);
          if (tab !== 'chats') closeActiveChat();
        }}
      />

      {/* MODALS */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onOpenFirebaseConfig={() => setFirebaseSetupOpen(true)}
        />
      )}

      {createPostOpen && (
        <CreatePostModal onClose={() => setCreatePostOpen(false)} />
      )}

      {editProfileOpen && (
        <EditProfileModal onClose={() => setEditProfileOpen(false)} />
      )}

      {privacyModalOpen && (
        <PrivacySettingsModal
          onClose={() => setPrivacyModalOpen(false)}
          onOpenBlockedUsers={() => {
            setPrivacyModalOpen(false);
            setSubView('blocked_users');
          }}
        />
      )}

      {notificationsOpen && (
        <NotificationsModal
          onClose={() => setNotificationsOpen(false)}
          onViewUserProfile={(u) => setInspectedUser(u)}
          onOpenFriendRequests={() => {
            setNotificationsOpen(false);
            setSubView('friend_requests');
          }}
        />
      )}

      {firebaseSetupOpen && (
        <FirebaseSetupModal onClose={() => setFirebaseSetupOpen(false)} />
      )}

      {friendsModalTab && (
        <FriendsModal
          initialTab={friendsModalTab}
          targetUser={inspectedUser || currentUser}
          onClose={() => setFriendsModalTab(null)}
          onSelectUser={(u) => {
            setFriendsModalTab(null);
            setInspectedUser(u);
          }}
        />
      )}
    </div>
  );
}
