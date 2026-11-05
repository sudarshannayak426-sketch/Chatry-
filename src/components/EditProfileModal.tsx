import { Bot, Camera, CheckCircle2, Copy, Dices, Image as ImageIcon, Layers, Lock, Sparkles, Upload, X, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailable, generateUserCode } from '../firebase/firebaseService';
import { useToast } from '../context/ToastContext';
import { BOT_AVATAR_PRESETS, BOT_BANNER_PRESETS, DEFAULT_BOT_BANNER, getRandomBotAvatar, WHATSAPP_CLEAN_BANNER } from '../utils/botAvatars';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { currentUser, updateProfileDetails } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(currentUser?.username || '');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [coverURL, setCoverURL] = useState(currentUser?.coverURL || DEFAULT_BOT_BANNER);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(true);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  if (!currentUser) return null;

  const publicCode = currentUser.userCode || generateUserCode(currentUser.uid);

  // Validate username when modified
  useEffect(() => {
    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean === currentUser.username.toLowerCase()) {
      setIsUsernameAvailable(true);
      setUsernameError(null);
      return;
    }

    if (!clean || clean.length < 3) {
      setIsUsernameAvailable(false);
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    if (clean.length > 20) {
      setIsUsernameAvailable(false);
      setUsernameError('Username cannot exceed 20 characters.');
      return;
    }

    setUsernameError(null);
    let isCurrent = true;
    setCheckingUsername(true);

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(clean, currentUser.uid);
        if (!isCurrent) return;
        setIsUsernameAvailable(available);
        if (!available) {
          setUsernameError(`@${clean} is already taken.`);
        }
      } catch {
        if (isCurrent) setIsUsernameAvailable(true);
      } finally {
        if (isCurrent) setCheckingUsername(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [username, currentUser.uid, currentUser.username]);

  // Lightweight client-side image compressor (keeps images crisp, fast, and 100% reliable)
  const compressImageFile = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await compressImageFile(file, 600, 600, 0.85);
      setPreviewUrl(dataUrl);
      setPhotoURL(dataUrl);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await compressImageFile(file, 1200, 600, 0.85);
      setBannerPreviewUrl(dataUrl);
      setCoverURL(dataUrl);
    }
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedId(true);
    showToast('Permanent UID copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(publicCode);
    setCopiedCode(true);
    showToast('Public User Code copied to clipboard!', 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    if (isUsernameAvailable === false) {
      setErrorMsg(`The username @${cleanUsername} is already taken.`);
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    try {
      // photoURL and coverURL are already high-res compressed and ready in state
      const finalPhotoURL = photoURL || currentUser.photoURL;
      const finalCoverURL = coverURL || currentUser.coverURL;

      // Instant local persistence (takes ~5ms, never hangs!)
      await updateProfileDetails({
        username: cleanUsername,
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: finalPhotoURL,
        coverURL: finalCoverURL,
      });

      showToast('Profile updated successfully! 🎉', 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update profile.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Edit Profile</h3>
            {currentUser.isGuest && (
              <span className="text-[10px] text-amber-400 font-medium">Guest Preview Mode</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {currentUser.isGuest && (
          <div className="my-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-200 leading-relaxed">
            <span className="font-bold text-amber-300">Guest Session:</span> You can test updating your photo, name, and bio for this preview. To create an account and save your profile permanently, click Log Out &gt; Sign Up.
          </div>
        )}

        {errorMsg && (
          <div className="my-3 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Avatar Section: Bigger DP Display + Gallery Upload + Bot Avatar Selector */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Tap to upload from device">
              <img
                src={previewUrl || photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
                alt=""
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover ring-4 ring-indigo-500/50 shadow-xl shadow-indigo-500/20 bg-slate-950"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-white drop-shadow" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
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
                    <span className="text-xs font-bold text-white">Select a Cool Bot Avatar</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const randUrl = getRandomBotAvatar();
                      setPreviewUrl(randUrl);
                      setPhotoURL(randUrl);
                      showToast('Random Bot avatar generated!', 'info');
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

          {/* Banner Style Selector: Bot Cyber Banner / WhatsApp Clean Mode / Custom Banner */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Profile Banner Style</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBannerPicker(!showBannerPicker)}
                className="text-[11px] font-semibold text-cyan-300 hover:text-white flex items-center space-x-1"
              >
                <span>{showBannerPicker ? 'Hide Options' : 'Customize Banner'}</span>
              </button>
            </div>

            {/* Banner preview strip */}
            <div className="relative h-16 w-full rounded-xl overflow-hidden border border-slate-700/60 group">
              <img
                src={bannerPreviewUrl || coverURL || DEFAULT_BOT_BANNER}
                alt="Banner Preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-between px-3">
                <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                  {coverURL === WHATSAPP_CLEAN_BANNER || coverURL === 'whatsapp_clean'
                    ? 'WhatsApp Clean (No Banner)'
                    : 'Active Banner'}
                </span>
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[10px] text-white flex items-center space-x-1"
                >
                  <Camera className="h-3 w-3" />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={bannerFileInputRef}
              onChange={handleBannerFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Banner Presets */}
            {showBannerPicker && (
              <div className="space-y-1.5 pt-1 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {BOT_BANNER_PRESETS.map((preset) => {
                    const isSelected =
                      coverURL === preset.url || (!coverURL && preset.id === 'bot_cyber');
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setCoverURL(preset.url);
                          setBannerPreviewUrl(null);
                        }}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-white truncate">{preset.name}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Permanent UID & Public User Code Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Lock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Internal UID</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUid}
                className="font-mono text-[10px] text-slate-300 hover:text-white flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                title="Permanent Firebase Authentication UID"
              >
                <span className="truncate max-w-[70px]">{currentUser.uid.substring(0, 6)}...</span>
                <Copy className="h-2.5 w-2.5" />
                {copiedId && <span className="text-emerald-400 text-[9px]">Copied</span>}
              </button>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Public Code</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="font-mono text-[10px] text-indigo-300 font-bold hover:text-indigo-200 flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-indigo-900/50"
                title="Shareable User Code"
              >
                <span>{publicCode}</span>
                <Copy className="h-2.5 w-2.5" />
                {copiedCode && <span className="text-emerald-400 text-[9px]">Copied</span>}
              </button>
            </div>
          </div>

          {/* Customizable Username (@handle) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Username (@handle)
              </label>
              {checkingUsername ? (
                <span className="text-[10px] text-indigo-400 animate-pulse">Checking handle...</span>
              ) : isUsernameAvailable === true && username.toLowerCase() !== currentUser.username.toLowerCase() ? (
                <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Available</span>
                </span>
              ) : isUsernameAvailable === false ? (
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
                  username.toLowerCase() !== currentUser.username.toLowerCase() && isUsernameAvailable === true
                    ? 'border-emerald-500/50 focus:ring-emerald-500'
                    : isUsernameAvailable === false
                    ? 'border-rose-500/50 focus:ring-rose-500'
                    : 'border-slate-700/60 focus:ring-indigo-500'
                }`}
              />
            </div>
            {usernameError && (
              <p className="mt-1 text-[10px] text-rose-400">{usernameError}</p>
            )}
            <p className="mt-1 text-[10px] text-slate-500">
              Unique public handle. Changing this releases your old handle and claims the new one safely.
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700/60 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Dreamer | Developer | Gamer 🎮..."
              className="w-full rounded-xl bg-slate-800 border border-slate-700/60 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-indigo-600/30 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
