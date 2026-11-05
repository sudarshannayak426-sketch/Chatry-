import { AlertTriangle, CheckCircle, ShieldAlert, UserX, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toggleBlockUser } from '../firebase/firebaseService';
import { UserProfile } from '../types';

interface BlockReportModalProps {
  type: 'block' | 'report';
  targetUser: UserProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Inappropriate or offensive media',
  'Impersonating someone else',
  'Scam or fraudulent activity',
  'Other violation of community guidelines',
];

export const BlockReportModal: React.FC<BlockReportModalProps> = ({
  type,
  targetUser,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!targetUser || !currentUser) return null;

  const handleBlockConfirm = async () => {
    try {
      setSubmitting(true);
      await toggleBlockUser(currentUser.uid, targetUser.uid);
      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // In real app / Firestore, report is filed to `reports` collection
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-3xl glass-panel shadow-2xl overflow-hidden border border-slate-700/60 p-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-6 text-center animate-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {type === 'block' ? 'User Blocked' : 'Report Submitted'}
            </h3>
            <p className="text-xs text-slate-400">
              {type === 'block'
                ? `@${targetUser.username} can no longer message you or view your profile.`
                : 'Thank you for helping keep the Chatry community safe.'}
            </p>
          </div>
        ) : type === 'block' ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Block @{targetUser.username}?</h3>
                <p className="text-[11px] text-slate-400">{targetUser.displayName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              They will not be notified that you blocked them. They will no longer be able to send you direct messages, see your online activity, or view your posts.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockConfirm}
                disabled={submitting}
                className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-amber-600/30 transition-colors"
              >
                {submitting ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Report @{targetUser.username}</h3>
                <p className="text-[11px] text-slate-400">Select an issue with this account</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400">Reason</label>
              <select
                value={selectedReason}
                onChange={e => setSelectedReason(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700/60 p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {REPORT_REASONS.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400">
                Additional context (optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Describe what occurred..."
                className="w-full rounded-xl bg-slate-800 border border-slate-700/60 p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-rose-600/30 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
