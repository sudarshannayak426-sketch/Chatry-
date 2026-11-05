import { AlertCircle, CheckCircle2, Cloud, ExternalLink, Settings, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface FirebaseBannerProps {
  onOpenConfig: () => void;
}

export const FirebaseBanner: React.FC<FirebaseBannerProps> = ({ onOpenConfig }) => {
  const { isConfigured, missingConfigFields } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isConfigured || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-rose-600/90 text-white px-4 py-2.5 text-xs shadow-lg backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 animate-bounce" />
          <span className="font-semibold">
            Firebase Configuration Required:
          </span>
          <span className="opacity-90 hidden sm:inline">
            Connect your Firebase project to enable real Email/Google Auth, Cloud Firestore, and Storage. Missing: {missingConfigFields.join(', ')}.
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onOpenConfig}
            className="rounded-lg bg-white text-slate-900 font-bold px-3 py-1 shadow hover:bg-slate-100 transition-colors"
          >
            Configure Firebase
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-black/20 text-white/80 hover:text-white"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
