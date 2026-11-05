import { Eye, Lock, Shield, UserX, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface PrivacySettingsModalProps {
  onClose: () => void;
  onOpenBlockedUsers: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  onClose,
  onOpenBlockedUsers,
}) => {
  const { currentUser, isGuest, updateProfileDetails } = useAuth();
  const { showToast } = useToast();
  const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(currentUser?.showOnlineStatus ?? true);
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const handleSave = async () => {
    if (isGuest) {
      showToast('Guest accounts cannot save persistent privacy settings.', 'info');
      return;
    }
    setSaving(true);
    try {
      await updateProfileDetails({
        isPrivate,
        showOnlineStatus,
      });
      showToast('Privacy settings saved!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Privacy & Security</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Private Account toggle */}
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <h4 className="text-xs font-bold text-white">Private Account</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When enabled, only accepted friends can view your moments and feed posts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              isPrivate ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${
                isPrivate ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Online Status toggle */}
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">Show Activity Status</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Show when you are active on Chatry or recently online.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowOnlineStatus(!showOnlineStatus)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              showOnlineStatus ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${
                showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Blocked accounts button */}
        <div
          onClick={() => {
            onClose();
            onOpenBlockedUsers();
          }}
          className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-800"
        >
          <div className="flex items-center space-x-2">
            <UserX className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-bold text-white">Blocked Users</span>
          </div>
          <span className="text-xs text-indigo-400 font-semibold">Manage &rarr;</span>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-indigo-600/30"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
