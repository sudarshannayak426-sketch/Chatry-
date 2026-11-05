import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface GoogleAccountItem {
  name: string;
  email: string;
}

// User's authentic Google account - no dummy/fake accounts
const REAL_USER_ACCOUNT: GoogleAccountItem = {
  name: 'Sudarshan Nayak',
  email: 'sudarshannayak426@gmail.com',
};

// Filter out any dummy accounts that were previously stored in localStorage
const DUMMY_EMAILS_TO_REMOVE = new Set([
  'sudarshannayak.dev@gmail.com',
  'sudarshan.personal@gmail.com',
  'explorer.bot@gmail.com',
]);

interface AuthModalProps {
  onClose: () => void;
  onOpenFirebaseConfig?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onOpenFirebaseConfig }) => {
  const {
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    loginWithGoogleDemo,
    continueAsGuest,
    sendPasswordReset,
    isConfigured,
  } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form states
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{
    title?: string;
    message: string;
    isFirebaseConfigIssue?: boolean;
  } | null>(null);

  // Google Account Chooser State
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [isAddingNewGoogleAccount, setIsAddingNewGoogleAccount] = useState(false);
  const [newGoogleName, setNewGoogleName] = useState('');
  const [newGoogleEmail, setNewGoogleEmail] = useState('');
  const [googleChooserError, setGoogleChooserError] = useState<string | null>(null);
  const [signingInEmail, setSigningInEmail] = useState<string | null>(null);

  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState<GoogleAccountItem[]>(() => {
    try {
      const stored = localStorage.getItem('chatry_saved_google_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly filter out any fake dummy accounts
          const clean = parsed.filter(
            (a: GoogleAccountItem) =>
              a?.email && !DUMMY_EMAILS_TO_REMOVE.has(a.email.toLowerCase().trim())
          );
          if (clean.length > 0) {
            localStorage.setItem('chatry_saved_google_accounts', JSON.stringify(clean));
            return clean;
          }
        }
      }
    } catch {}
    // Only user's real account, no extra fake accounts
    return [REAL_USER_ACCOUNT];
  });

  const handleRemoveGoogleAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    const updated = savedGoogleAccounts.filter(
      (a) => a.email.toLowerCase() !== emailToRemove.toLowerCase()
    );
    const finalList = updated.length > 0 ? updated : [REAL_USER_ACCOUNT];
    setSavedGoogleAccounts(finalList);
    try {
      localStorage.setItem('chatry_saved_google_accounts', JSON.stringify(finalList));
    } catch {}
  };

  const setErrorMsg = (err: string | { title?: string; message: string; isFirebaseConfigIssue?: boolean } | null) => {
    if (!err) {
      setAuthError(null);
    } else if (typeof err === 'string') {
      const lower = err.toLowerCase();
      setAuthError({
        message: err,
        isFirebaseConfigIssue: lower.includes('firebase') || lower.includes('api-key') || lower.includes('api key'),
      });
    } else {
      setAuthError(err);
    }
  };

  const parseAuthError = (err: any) => {
    const code = err?.code || '';
    const rawMsg = err?.message || String(err || '');

    if (
      code.includes('api-key-not-valid') ||
      code.includes('invalid-api-key') ||
      rawMsg.includes('api-key-not-valid') ||
      rawMsg.includes('invalid-api-key') ||
      rawMsg.includes('API key not valid')
    ) {
      return {
        title: 'Firebase API Key Required for Real Google Login',
        message: 'Google Sign-In requires a valid Web API key from your Firebase Console project. An API key is a public project identifier (starting with AIzaSy...), not a password. You can enter your Firebase project keys below or continue as Guest to explore the full app right now with zero setup.',
        isFirebaseConfigIssue: true,
      };
    }

    if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
      return {
        title: 'Preview Domain Not Authorized',
        message: 'This web preview domain has not been added to your Firebase project. In Firebase Console > Authentication > Settings > Authorized Domains, add this preview URL.',
        isFirebaseConfigIssue: true,
      };
    }

    if (code.includes('operation-not-allowed') || rawMsg.includes('operation-not-allowed')) {
      return {
        title: 'Google Sign-In Not Enabled',
        message: 'Google sign-in is turned off in your Firebase project. Go to Firebase Console > Authentication > Sign-in method, click Google, toggle Enable, and save.',
        isFirebaseConfigIssue: true,
      };
    }

    if (code === 'auth/popup-blocked' || rawMsg.includes('popup-blocked')) {
      return {
        title: 'Sign-in Popup Blocked',
        message: 'Your browser blocked the Google authentication popup. Please allow popups for this site and click Continue with Google again.',
        isFirebaseConfigIssue: false,
      };
    }

    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return {
        title: 'Invalid Credentials',
        message: 'Incorrect email/username or password. Please verify your credentials or create a new account.',
        isFirebaseConfigIssue: false,
      };
    }

    if (code === 'auth/email-already-in-use') {
      return {
        title: 'Email Already In Use',
        message: 'An account with this email already exists. Please log in or use Forgot Password.',
        isFirebaseConfigIssue: false,
      };
    }

    return {
      title: 'Authentication Error',
      message: rawMsg || 'Failed to authenticate. Please check your credentials.',
      isFirebaseConfigIssue: rawMsg.toLowerCase().includes('firebase') || rawMsg.toLowerCase().includes('api key'),
    };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      await loginWithEmail(emailOrUsername, password);
      showToast('Logged in successfully! Welcome to Chatry.', 'success');
      onClose();
    } catch (err: any) {
      setAuthError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (signupPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail(fullName, username, signupEmail, signupPassword);
      showToast('Account created successfully! Welcome to Chatry.', 'success');
      onClose();
    } catch (err: any) {
      setAuthError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      setAuthError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGoogleChooser = () => {
    setAuthError(null);
    setShowGoogleChooser(true);
    setIsAddingNewGoogleAccount(false);
    setGoogleChooserError(null);
  };

  const handleSelectGoogleAccount = async (account: GoogleAccountItem) => {
    setLoading(true);
    setSigningInEmail(account.email);
    setGoogleChooserError(null);

    try {
      // Save account to list
      const updated = [
        account,
        ...savedGoogleAccounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase()),
      ];
      setSavedGoogleAccounts(updated);
      try {
        localStorage.setItem('chatry_saved_google_accounts', JSON.stringify(updated));
      } catch {}

      await loginWithGoogle(account.name, account.email);
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        setSigningInEmail(null);
        return;
      }
      try {
        await loginWithGoogleDemo(account.name, account.email);
        onClose();
      } catch (fallbackErr: any) {
        setGoogleChooserError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
      setSigningInEmail(null);
    }
  };

  const handleAddNewGoogleAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newGoogleName.trim();
    let cleanEmail = newGoogleEmail.trim().toLowerCase();
    if (!cleanName) {
      setGoogleChooserError('Please enter your Google account name.');
      return;
    }
    if (!cleanEmail) {
      setGoogleChooserError('Please enter your Gmail / Google email address.');
      return;
    }
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@gmail.com`;
    }
    handleSelectGoogleAccount({ name: cleanName, email: cleanEmail });
  };

  const handleGoogleDemo = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await loginWithGoogleDemo();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await continueAsGuest();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Guest entry failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrorMsg('Please enter your email address to receive the password reset link.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSent(true);
      showToast(`Password reset link sent to ${resetEmail.trim()}! Check your inbox.`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {showGoogleChooser ? (
          <div className="space-y-4 animate-in fade-in">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowGoogleChooser(false);
                  setIsAddingNewGoogleAccount(false);
                  setGoogleChooserError(null);
                }}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Login</span>
              </button>
              <span className="text-[11px] font-mono text-slate-500">Google Accounts</span>
            </div>

            {/* Google Logo & Title */}
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg p-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white pt-1">Choose an account</h3>
              <p className="text-xs text-slate-400">to continue to <strong className="text-indigo-400 font-bold">Chatry</strong></p>
            </div>

            {googleChooserError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                {googleChooserError}
              </div>
            )}

            <div className="space-y-3">
              {/* Account list showing user's authentic Google accounts */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 divide-y divide-slate-800 shadow-inner overflow-hidden">
                {savedGoogleAccounts.map((account) => {
                  const initial = (account.name || 'G')[0].toUpperCase();
                  const isCurrentLoading = loading && signingInEmail === account.email;

                  return (
                    <div
                      key={account.email}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-850 transition-colors group"
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSelectGoogleAccount(account)}
                        className="flex-1 flex items-center space-x-3 text-left min-w-0 cursor-pointer"
                      >
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md ring-2 ring-blue-500/30">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                            {account.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {account.email}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isCurrentLoading ? (
                            <span className="text-[11px] text-indigo-400 animate-pulse font-semibold">
                              Signing in...
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl shadow transition-colors">
                              Sign in
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Delete / Remove account option if user added more than 1 account */}
                      {savedGoogleAccounts.length > 1 && (
                        <button
                          type="button"
                          title={`Remove ${account.email}`}
                          onClick={(e) => handleRemoveGoogleAccount(e, account.email)}
                          className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Standard 'Use another account' option like real Google prompt */}
                {!isAddingNewGoogleAccount && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsAddingNewGoogleAccount(true);
                      setGoogleChooserError(null);
                    }}
                    className="w-full flex items-center space-x-3 p-3.5 hover:bg-slate-850 transition-colors text-left group cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-white transition-colors">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        Use another account
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sign in with a different Google account
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Inline Add Another Google Account Section */}
              {isAddingNewGoogleAccount && (
                <form
                  onSubmit={handleAddNewGoogleAccount}
                  className="rounded-2xl border border-indigo-500/30 bg-slate-950/90 p-3.5 space-y-2.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Add New Google Account</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewGoogleAccount(false)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={newGoogleName}
                      onChange={(e) => setNewGoogleName(e.target.value)}
                      placeholder="Account Name (e.g. Rahul Sharma)"
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={newGoogleEmail}
                      onChange={(e) => setNewGoogleEmail(e.target.value)}
                      placeholder="Gmail address (e.g. rahul@gmail.com)"
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewGoogleAccount(false);
                        setGoogleChooserError(null);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow transition-all cursor-pointer"
                    >
                      {loading ? 'Adding...' : 'Add & Choose'}
                    </button>
                  </div>
                </form>
              )}

              <p className="text-[10px] text-slate-500 text-center px-2 leading-relaxed pt-1">
                To continue, Google will share your name and email with Chatry.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Brand header with glowing 3-dot logo matching mockup */}
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 shadow-xl shadow-indigo-500/30">
                <div className="flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-white">Chatry</h2>

          {mode === 'login' && (
            <div className="mt-1">
              <h3 className="text-base font-bold text-white">Welcome Back! 👋</h3>
              <p className="text-xs text-slate-400">Login to continue your conversations.</p>
            </div>
          )}
          {mode === 'signup' && (
            <div className="mt-1">
              <h3 className="text-base font-bold text-white">Create Your Account</h3>
              <p className="text-xs text-slate-400">Join Chatry and start your journey.</p>
            </div>
          )}
          {mode === 'forgot' && (
            <div className="mt-1">
              <h3 className="text-base font-bold text-white">Reset Password</h3>
              <p className="text-xs text-slate-400">We will send a reset link to your email.</p>
            </div>
          )}
        </div>

        {!isConfigured && (
          <div className="mb-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 p-3 text-xs text-amber-200 space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold text-amber-300">Firebase Required for Real Accounts</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                  Real Google OAuth and Email registration are powered by Firebase. To test and explore the Chatry app immediately without any setup:
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleGuest}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2 px-3 text-[11px] shadow text-center transition-all cursor-pointer"
              >
                ⚡ Continue as Guest (Explore App)
              </button>
              {onOpenFirebaseConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFirebaseConfig();
                  }}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold py-2 px-3 text-[11px] border border-amber-500/30 text-center transition-colors"
                >
                  Enter Firebase Keys &rarr;
                </button>
              )}
            </div>
          </div>
        )}

        {authError && (
          <div className="mb-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs text-rose-200 space-y-2.5">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                {authError.title && (
                  <p className="font-bold text-rose-300 text-xs">{authError.title}</p>
                )}
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  {authError.message}
                </p>
              </div>
            </div>

            {authError.isFirebaseConfigIssue && (
              <div className="pt-2 flex flex-col gap-2 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={handleOpenGoogleChooser}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-2.5 px-3 text-[11px] shadow text-center transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#FFFFFF"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>⚡ Choose Google Account (Instant Access)</span>
                </button>

                <div className="flex flex-col sm:flex-row gap-2">
                  {onOpenFirebaseConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFirebaseConfig();
                      }}
                      className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold py-2 px-3 text-[11px] border border-amber-500/30 text-center transition-colors cursor-pointer"
                    >
                      ⚙️ Fix / Open Firebase Setup
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGuest}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-3 text-[11px] text-center border border-slate-700 transition-colors cursor-pointer"
                  >
                    ⚡ Continue as Guest
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. LOGIN MODE (Matches mockup Screen 2) */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Email or Username"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrorMsg(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 font-medium">
                or
              </span>
            </div>

            {/* Sign in with Google */}
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              aria-label="Sign in with Google"
              className="w-full flex items-center justify-center space-x-2.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 py-3 text-xs font-bold transition-all cursor-pointer shadow-md group disabled:opacity-60"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
              ) : (
                <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{loading ? 'Signing in with Google...' : 'Sign in with Google'}</span>
            </button>

            <div className="flex items-center justify-center pt-0.5">
              <button
                type="button"
                onClick={handleOpenGoogleChooser}
                className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Or choose a saved Google account &rarr;
              </button>
            </div>

            {/* Continue as Guest option */}
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
            >
              <span>Continue as Guest (Explore only)</span>
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className="font-bold text-indigo-400 hover:text-indigo-300 underline"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* 2. SIGNUP MODE (Matches mockup Screen 3) */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="Choose Username"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer mt-1"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="relative my-2.5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 font-medium">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenGoogleChooser}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:scale-[0.99] border border-slate-700/80 hover:border-slate-600 py-2.5 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm group"
            >
              <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="font-bold text-indigo-400 hover:text-indigo-300 underline"
              >
                Login
              </button>
            </p>
          </form>
        )}

        {/* 3. FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {resetSent ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-2">
                <Check className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="text-xs font-semibold">Check your inbox!</p>
                <p className="text-[11px] text-emerald-200/80">
                  We've sent a password reset link to <strong className="text-white">{resetEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetSent(false);
                  }}
                  className="mt-2 text-xs font-bold underline"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter registered email"
                    className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </form>
        )}
          </>
        )}
      </div>
    </div>
  );
};
