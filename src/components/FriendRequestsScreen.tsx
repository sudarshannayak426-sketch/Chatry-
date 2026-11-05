import { ArrowLeft, Check, CheckCircle2, UserPlus, X } from 'lucide-react';
import React from 'react';
import { useSocial } from '../context/SocialContext';
import { FriendRequest } from '../types';

interface FriendRequestsScreenProps {
  onBack: () => void;
  onViewUserProfile: (uid: string) => void;
}

export const FriendRequestsScreen: React.FC<FriendRequestsScreenProps> = ({
  onBack,
  onViewUserProfile,
}) => {
  const { friendRequests, handleAcceptRequest, handleRejectRequest } = useSocial();

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Header matching mockup */}
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-white">Follow Requests</h2>
      </div>

      {/* List */}
      <div className="space-y-3 pt-1">
        {friendRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400/80 mb-2" />
            <h3 className="text-sm font-bold text-white">No Pending Requests</h3>
            <p className="text-xs text-slate-500">
              When other users request to connect with you, they will appear here.
            </p>
          </div>
        ) : (
          friendRequests.map((req: FriendRequest) => (
            <div
              key={req.id}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
            >
              <div
                onClick={() => onViewUserProfile(req.senderId)}
                className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
              >
                <img
                  src={req.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.senderUsername}`}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0"
                />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-white truncate">{req.senderName}</h4>
                  <p className="text-[10px] text-slate-400 truncate">@{req.senderUsername}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Wants to follow you</p>
                </div>
              </div>

              {/* Accept & Reject Buttons matching mockup */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleAcceptRequest(req)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-blue-600/25 transition-all"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(req.id)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
