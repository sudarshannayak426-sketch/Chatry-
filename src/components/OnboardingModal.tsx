import {
  Bot,
  Camera,
  CheckCircle2,
  Dices,
  Image as ImageIcon,
  Lock,
  Sparkles,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailable } from '../firebase/firebaseService';
import { uploadMediaFile } from '../firebase/storageService';
import { BOT_AVATAR_PRESETS, getRandomBotAvatar } from '../utils/botAvatars';

export const OnboardingModal: React.FC = () => {
  const { pendingAuthUser, completeOnboarding, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialHandle = pendingAuthUser?.email
    ? pendingAuthUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
    : '';

  const [username, setUsername] = useState(initialHandle || '');
  const [displayName, setDisplayName] = useState(pendingAuthUser?.displayName || '');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState(pendingAuthUser?.photoURL || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showBotPicker, setShowBotPicker] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Validate and check username availability
  useEffect(() => {
    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) {
      setIsAvailable(null);
      setUsernameError('Username is required.');
      return;
    }
    if (clean.length < 3) {
      setIsAvailable(false);
      setUsernameError('Username must be at least 3 characters.');
      return;
    }
    if (clean.length > 20) {
      setIsAvailable(false);
      setUsernameError('Username cannot exceed 20 characters.');
      return;
    }

    setUsernameError(null);
    let isCurrent = true;
    setCheckingUsername(true);

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(clean, pendingAuthUser?.uid);
        if (!isCurrent) return;
        setIsAvailable(available);
        if (!available) {
          setUsernameError(`@${clean} is already taken.`);
        }
      } catch {
        if (isCurrent) setIsAvailable(true);
      } finally {
        if (isCurrent) setCheckingUsername(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [username, pendingAuthUser?.uid]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuthUser) return;

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameError('Please choose a valid username (min 3 characters).');
      return;
    }

    if (isAvailable === false) {
      setUsernameError('This username is already taken. Please choose another.');
      return;
    }

    setGeneralError(null);
    setIsSubmitting(true);

    try {
      let finalPhotoURL = photoURL;
      if (selectedFile) {
        setIsUploadingPhoto(true);
        finalPhotoURL = await uploadMediaFile(
          selectedFile,
          'avatars',
          pendingAuthUser.uid,
          (percent) => setUploadProgress(percent)
        );
        setIsUploadingPhoto(false);
      }

      await completeOnboarding({
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        photoURL: finalPhotoURL,
      });
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || 'Failed to complete profile onboarding.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingPhoto(false);
    }
  };

  if (!pendingAuthUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="text-center space-y-1.5 pb-4 border-b border-slate-800">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Welcome to Chatry!</h2>
          <p className="text-xs text-slate-400">
            Set up your permanent profile and unique public username to get started.
          </p>
        </div>

        {generalError && (
          <div className="my-3 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Permanent Internal UID Badge (Read-only) */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2 text-slate-400">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span>Internal Account UID</span>
            </div>
            <span className="font-mono text-slate-300 text-[10px] truncate max-w-[170px]" title={pendingAuthUser.uid}>
              {pendingAuthUser.uid}
            </span>
          </div>

          {/* Profile Picture: Bigger Display + Device Gallery Upload + Bot Avatar Selector */}
          <div className="flex flex-col items-center">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Tap to choose photo from device"
            >
              <img
                src={
                  previewUrl ||
                  photoURL ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${username || 'chatry'}`
                }
                alt="Avatar"
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover ring-4 ring-indigo-500/50 shadow-xl shadow-indigo-500/20 bg-slate-950"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-white drop-shadow" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Avatar action buttons */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Upload From Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBotPicker(!showBotPicker)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  showBotPicker
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-indigo-300'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Choose Bot DP</span>
              </button>
            </div>

            {/* Interactive Bot Avatar Picker */}
            {showBotPicker && (
              <div className="w-full mt-3 p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Bot className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Choose Bot Avatar</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const randUrl = getRandomBotAvatar();
                      setPreviewUrl(randUrl);
                      setPhotoURL(randUrl);
                      setSelectedFile(null);
                    }}
                    className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-950/80 px-2 py-1 rounded-lg border border-indigo-500/30"
                  >
                    <Dices className="h-3 w-3" />
                    <span>Random Bot</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {BOT_AVATAR_PRESETS.map((bot) => {
                    const isSelected = (previewUrl || photoURL) === bot.url;
                    return (
                      <button
                        key={bot.id}
                        type="button"
                        onClick={() => {
                          setPreviewUrl(bot.url);
                          setPhotoURL(bot.url);
                          setSelectedFile(null);
                        }}
                        className={`group relative p-1 rounded-xl transition-all flex flex-col items-center ${
                          isSelected
                            ? 'bg-indigo-600/30 ring-2 ring-indigo-500 scale-105'
                            : 'bg-slate-900 hover:bg-slate-800 border border-slate-800'
                        }`}
                        title={bot.name}
                      >
                        <img
                          src={bot.url}
                          alt={bot.name}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain"
                        />
                        <span className="text-[9px] text-slate-300 truncate max-w-[48px] mt-1 group-hover:text-white">
                          {bot.name.split(' ')[0]}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Uploading progress bar */}
          {isUploadingPhoto && (
            <div className="space-y-1 text-xs text-indigo-300">
              <div className="flex justify-between text-[11px]">
                <span>Uploading photo to Firebase Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Public Username */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Custom Public Username *
              </label>
              {checkingUsername ? (
                <span className="text-[10px] text-indigo-400 animate-pulse">Checking availability...</span>
              ) : isAvailable === true ? (
                <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Available</span>
                </span>
              ) : isAvailable === false ? (
                <span className="text-[10px] text-rose-400 flex items-center space-x-1 font-semibold">
                  <XCircle className="h-3 w-3" />
                  <span>Unavailable</span>
                </span>
              ) : null}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono text-slate-500">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="your_handle"
                className={`w-full rounded-xl bg-slate-800 border pl-8 pr-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 ${
                  isAvailable === true
                    ? 'border-emerald-500/50 focus:ring-emerald-500'
                    : isAvailable === false
                    ? 'border-rose-500/50 focus:ring-rose-500'
                    : 'border-slate-700/70 focus:ring-indigo-500'
                }`}
              />
            </div>
            {usernameError && (
              <p className="mt-1 text-[10px] text-rose-400">{usernameError}</p>
            )}
            <p className="mt-1 text-[10px] text-slate-500">
              3-20 characters: letters, numbers, and underscores. You can search or be found by this handle.
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl bg-slate-800 border border-slate-700/70 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Bio (Optional) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Bio (Optional)
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others what you love, share your vibes..."
              className="w-full rounded-xl bg-slate-800 border border-slate-700/70 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={logout}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAvailable === false || checkingUsername || !username.trim()}
              className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Creating Profile...' : 'Complete & Enter Chatry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
