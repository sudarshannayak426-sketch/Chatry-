import { AlertTriangle, ArrowLeft, ChevronRight, Lock, ShieldAlert, UserX, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitUserReport, toggleBlockUser } from '../firebase/firebaseService';

interface BlockedUsersScreenProps {
  onBack: () => void;
  onOpenSearch: () => void;
}

export const BlockedUsersScreen: React.FC<BlockedUsersScreenProps> = ({
  onBack,
  onOpenSearch,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportUsername, setReportUsername] = useState('');
  const [reportReason, setReportReason] = useState('Harassment or spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const blockedList = currentUser?.blockedUsers || [];

  const handleUnblock = async (uid: string) => {
    if (!currentUser) return;
    await toggleBlockUser(currentUser.uid, uid);
    showToast('User unblocked', 'info');
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await submitUserReport(currentUser.uid, reportUsername, reportReason, reportDetails);
      setReportSent(true);
      showToast('Report submitted for moderation', 'success');
      setTimeout(() => {
        setReportSent(false);
        setReportModalOpen(false);
        setReportUsername('');
        setReportDetails('');
      }, 1800);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report', 'error');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Header matching mockup Screen 14 */}
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-white">Blocked Users</h2>
      </div>

      {/* Main Empty / List Section */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
        {blockedList.length === 0 ? (
          <>
            {/* Lock illustration bubble matching mockup */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-400 shadow-xl shadow-blue-500/10">
              <Lock className="h-10 w-10 stroke-[2]" />
            </div>

            <h3 className="text-base font-bold text-white">No blocked users yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Block someone to prevent them from seeing your profile and messaging you.
            </p>

            <button
              onClick={onOpenSearch}
              className="w-full max-w-xs mx-auto rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-3 text-xs font-bold shadow-lg shadow-indigo-600/30 hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              Block User
            </button>
          </>
        ) : (
          <div className="space-y-2 text-left">
            <p className="text-xs font-bold text-slate-400">Blocked accounts ({blockedList.length}):</p>
            {blockedList.map((uid) => (
              <div
                key={uid}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60"
              >
                <span className="text-xs font-mono text-slate-300">UID: {uid}</span>
                <button
                  onClick={() => handleUnblock(uid)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 px-3 py-1 text-xs font-semibold"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report User Banner Card matching mockup */}
      <div
        onClick={() => setReportModalOpen(true)}
        className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-colors shadow-md"
      >
        <div className="flex items-center space-x-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Report User</h4>
            <p className="text-[10px] text-slate-400">Help us keep Chatry safe and friendly for everyone.</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500" />
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl">
            <button
              onClick={() => setReportModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {reportSent ? (
              <div className="p-6 text-center text-emerald-400 space-y-2">
                <ShieldAlert className="mx-auto h-10 w-10 text-emerald-400" />
                <p className="text-sm font-bold text-white">Report Received</p>
                <p className="text-xs text-slate-400">Thank you for reporting this issue.</p>
              </div>
            ) : (
              <form onSubmit={submitReport} className="space-y-3.5">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>Submit Safety Report</span>
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Username or User ID to Report
                  </label>
                  <input
                    type="text"
                    required
                    value={reportUsername}
                    onChange={(e) => setReportUsername(e.target.value)}
                    placeholder="@username or UID"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white"
                  >
                    <option>Harassment or bullying</option>
                    <option>Spam or scam</option>
                    <option>Inappropriate media</option>
                    <option>Impersonation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional context..."
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-semibold shadow"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
