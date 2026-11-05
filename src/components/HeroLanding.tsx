import { ArrowRight, Cloud, Flame, Sparkles, UserCheck } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';

interface HeroLandingProps {
  onOpenAuth: () => void;
  onOpenFirebaseConfig: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  onOpenAuth,
  onOpenFirebaseConfig,
}) => {
  const { continueAsGuest, isConfigured } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col items-center justify-between px-6 py-12 overflow-hidden bg-slate-950 text-center">
      {/* Background radial gradient waves matching Mockup Screen 1 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/25 to-blue-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/15 blur-[140px] rounded-full" />
      </div>

      <div />

      {/* Center Branding matching Mockup Screen 1 */}
      <div className="relative z-10 flex flex-col items-center max-w-md mx-auto space-y-6">
        {/* Glowing 3-dot Speech Bubble Logo */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 shadow-2xl shadow-indigo-500/50 ring-4 ring-white/10 animate-pulse">
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-full bg-white shadow" />
            <span className="h-3 w-3 rounded-full bg-white shadow [animation-delay:0.2s]" />
            <span className="h-3 w-3 rounded-full bg-white shadow [animation-delay:0.4s]" />
          </div>
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-b from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Chatry
          </h1>
          <p className="mt-2 text-sm sm:text-base font-semibold text-indigo-300 tracking-widest uppercase">
            Connect • Chat • Build
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
          A real-time social networking and one-to-one messaging website with friends-only feeds, custom audio moments, and verified profiles.
        </p>

        {/* CTA Buttons */}
        <div className="w-full space-y-2.5 pt-2">
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-3.5 text-xs font-bold shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Get Started / Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => continueAsGuest()}
            className="w-full rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/60 text-slate-300 py-3 text-xs font-semibold transition-colors"
          >
            Continue as Guest (Explore allowed screens)
          </button>

          {!isConfigured && (
            <button
              onClick={onOpenFirebaseConfig}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline block pt-1 mx-auto"
            >
              Configure Live Firebase Credentials &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Bottom text matching mockup Screen 1 */}
      <div className="relative z-10 pt-8">
        <p className="text-[11px] text-slate-500 font-medium">
          Your world, now in conversations.
        </p>
      </div>
    </div>
  );
};
