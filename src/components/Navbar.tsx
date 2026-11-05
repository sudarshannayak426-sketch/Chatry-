import {
  Bell,
  CheckCircle2,
  Cloud,
  Flame,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
  UserPlus,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocial } from '../context/SocialContext';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenFriendRequests: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onOpenFriendRequests,
  onOpenProfile,
  onOpenSettings,
  onOpenFirebaseConfig,
  onOpenAuthModal,
}) => {
  const { currentUser, isConfigured, isGuest, logout } = useAuth();
  const { totalUnread } = useChat();
  const { unreadNotifsCount, friendRequests } = useSocial();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        {/* Brand / Logo matching the mockup */}
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={onOpenProfile}>
          <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 shadow-md shadow-indigo-500/30">
            {/* 3 white dots inside speech bubble */}
            <div className="flex items-center space-x-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse [animation-delay:0.4s]" />
            </div>
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Chatry
          </span>
        </div>

        {/* Center / Search bar trigger */}
        <div className="hidden sm:flex flex-1 max-w-sm mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between rounded-full bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 px-4 py-1.5 text-xs text-slate-400 transition-colors shadow-inner"
          >
            <div className="flex items-center space-x-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search users, @username, ID...</span>
            </div>
            <kbd className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-500 border border-slate-700/50">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right action icons matching mockup */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Firebase Setup status button */}
          <button
            onClick={onOpenFirebaseConfig}
            className={`flex items-center space-x-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all ${
              isConfigured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 animate-pulse'
            }`}
            title="Firebase Configuration"
          >
            <Cloud className="h-3 w-3" />
            <span className="hidden md:inline">{isConfigured ? 'Firebase Live' : 'Setup Firebase'}</span>
          </button>

          {/* Friend Requests icon with badge */}
          {currentUser && !isGuest && friendRequests.length > 0 && (
            <button
              onClick={onOpenFriendRequests}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              title="Friend Requests"
            >
              <UserPlus className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white shadow">
                {friendRequests.length}
              </span>
            </button>
          )}

          {/* Notifications bell */}
          {currentUser && !isGuest && (
            <button
              onClick={onOpenNotifications}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white shadow">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          )}

          {/* User profile dropdown or Sign In */}
          {currentUser ? (
            <div className="flex items-center space-x-2">
              {/* Direct Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/80 hover:border-rose-500/30 text-[11px] font-semibold text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center space-x-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
                      alt={currentUser.displayName}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-500/30"
                    />
                    {currentUser.isOnline && !isGuest && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                    )}
                  </div>
                </button>

                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900/95 border border-slate-700/80 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-bold text-white truncate">{currentUser.displayName}</p>
                        {isGuest && (
                          <span className="rounded bg-amber-500/20 text-amber-300 text-[9px] px-1 font-semibold">
                            Guest
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-indigo-400 font-mono">@{currentUser.username}</p>
                      {currentUser.email && (
                        <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{currentUser.email}</p>
                      )}
                    </div>

                    <div className="py-1 text-xs">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <User className="h-4 w-4 text-indigo-400" />
                        <span>My Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenFirebaseConfig();
                        }}
                        className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Cloud className="h-4 w-4 text-amber-400" />
                        <span>Firebase Setup</span>
                      </button>

                      <div className="border-t border-slate-800 pt-1 mt-1">
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center space-x-2 rounded-xl px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{isGuest ? 'Exit Guest Mode' : 'Log Out'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
