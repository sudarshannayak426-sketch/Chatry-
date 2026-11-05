import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Cloud,
  Edit3,
  HelpCircle,
  Lock,
  LogOut,
  Rocket,
  Shield,
  UserX,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PublishGuideModal } from './PublishGuideModal';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenEditProfile: () => void;
  onOpenPrivacy: () => void;
  onOpenBlockedUsers: () => void;
  onOpenFirebaseConfig: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenEditProfile,
  onOpenPrivacy,
  onOpenBlockedUsers,
  onOpenFirebaseConfig,
}) => {
  const { currentUser, isGuest, logout } = useAuth();
  const { showToast } = useToast();
  const [publishGuideOpen, setPublishGuideOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Header matching mockup Screen 13 */}
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-white">Settings</h2>
      </div>

      {/* User summary card matching mockup */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 shadow-md">
        <img
          src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
          alt=""
          className="h-14 w-14 rounded-full object-cover ring-2 ring-indigo-500/30"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{currentUser.displayName}</h3>
          <p className="text-xs text-indigo-400 font-mono">@{currentUser.username}</p>
          {currentUser.email && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser.email}</p>
          )}
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {currentUser.uid}</p>
        </div>
      </div>

      {/* Menu items list matching mockup */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-md">
        <button
          onClick={onOpenEditProfile}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3">
            <Edit3 className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Edit Profile</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <button
          onClick={onOpenPrivacy}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3">
            <Lock className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Privacy Settings</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <button
          onClick={() => showToast('Notifications are active for friend requests and messages.', 'info')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3">
            <Bell className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Notifications</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <button
          onClick={onOpenBlockedUsers}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3">
            <UserX className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Blocked Users</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <button
          onClick={onOpenFirebaseConfig}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3">
            <Cloud className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">Firebase & Storage Settings</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <button
          onClick={() => setPublishGuideOpen(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <HelpCircle className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Help, Project Status & Publish Guide</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Ready
            </span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
        </button>

        <button
          onClick={async () => {
            try {
              onBack();
              await logout();
              showToast(isGuest ? 'Exited guest session.' : 'Logged out successfully.', 'info');
            } catch (err: any) {
              showToast(err?.message || 'Logged out.', 'info');
            }
          }}
          className="w-full flex items-center space-x-3 p-4 hover:bg-rose-500/10 text-rose-400 transition-colors text-left cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-xs font-bold">{isGuest ? 'Exit Guest Mode' : 'Log Out'}</span>
        </button>
      </div>

      {publishGuideOpen && (
        <PublishGuideModal
          onClose={() => setPublishGuideOpen(false)}
          onOpenFirebaseConfig={onOpenFirebaseConfig}
        />
      )}
    </div>
  );
};
