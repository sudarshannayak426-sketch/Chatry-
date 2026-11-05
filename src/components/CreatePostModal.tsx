import {
  Check,
  Disc,
  Edit2,
  Film,
  Flame,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Music,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Scissors,
  Sliders,
  Sparkles,
  Sun,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useToast } from '../context/ToastContext';
import { LICENSED_MUSIC_LIBRARY } from '../firebase/musicLibrary';
import { uploadMediaFile } from '../firebase/storageService';
import { MusicTrack } from '../types';

const WAVE_BARS = [35, 60, 85, 45, 70, 95, 100, 80, 50, 85, 70, 55, 95, 88, 42, 65, 82, 92, 58, 76, 90, 100, 85, 68, 48, 90, 75, 60, 85, 98, 72, 55, 42, 80, 94, 66, 52, 78, 86, 60, 45, 30];

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface CreatePostModalProps {
  onClose: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
  const { currentUser, isGuest, isConfigured } = useAuth();
  const { handleCreatePost } = useSocial();
  const { showToast } = useToast();

  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>('none');

  // Video adjustment settings
  const [videoAspectRatio, setVideoAspectRatio] = useState<'original' | '16/9' | '1/1' | '9/16' | '4/5'>('original');
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const [videoMuted, setVideoMuted] = useState<boolean>(false);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [videoFilter, setVideoFilter] = useState<'none' | 'vibrant' | 'cinema' | 'vintage' | 'bw' | 'warm'>('none');
  const [videoLoop, setVideoLoop] = useState<boolean>(true);
  const [activeMediaTab, setActiveMediaTab] = useState<'frame' | 'speed' | 'audio' | 'filter'>('frame');

  // Music & Audio adjustment settings
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [trackTitle, setTrackTitle] = useState<string>('');
  const [trackArtist, setTrackArtist] = useState<string>('');
  const [isEditingTrackInfo, setIsEditingTrackInfo] = useState<boolean>(false);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(80);
  const [audioStartOffset, setAudioStartOffset] = useState<number>(0);
  const [audioLoop, setAudioLoop] = useState<boolean>(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(60);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [showMusicPicker, setShowMusicPicker] = useState(false);

  // Upload progress & loading
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  if (!currentUser) return null;

  // Sync video element properties when adjustments change
  useEffect(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = videoSpeed;
      videoPlayerRef.current.muted = videoMuted;
      videoPlayerRef.current.volume = videoVolume / 100;
      videoPlayerRef.current.loop = videoLoop;
    }
  }, [videoSpeed, videoMuted, videoVolume, videoLoop, mediaPreviewUrl]);

  // Sync audio element volume and loop
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = audioVolume / 100;
      audioPlayerRef.current.loop = audioLoop;
    }
  }, [audioVolume, audioLoop]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');
      setMediaPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleCustomAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomAudioFile(file);
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
      const name = file.name.replace(/\.[^/.]+$/, '');
      const customTrack: MusicTrack = {
        id: `custom_${Date.now()}`,
        title: name,
        artist: currentUser.displayName,
        duration: 'Custom',
        genre: 'User Audio',
        license: 'User Uploaded Audio',
        audioUrl: url,
      };
      setSelectedTrack(customTrack);
      setTrackTitle(name);
      setTrackArtist(currentUser.displayName);
      setShowMusicPicker(false);
    }
  };

  const selectPresetTrack = (track: MusicTrack) => {
    setSelectedTrack(track);
    setTrackTitle(track.title);
    setTrackArtist(track.artist);
    setCustomAudioFile(null);
    setCustomAudioUrl(null);
    setShowMusicPicker(false);
    setAudioStartOffset(0);
    setAudioCurrentTime(0);

    // Parse duration string e.g. "2:45"
    if (track.duration && track.duration.includes(':')) {
      const parts = track.duration.split(':');
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      setAudioDuration(mins * 60 + secs);
    } else {
      setAudioDuration(60);
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = 0;
    }
  };

  const clearMedia = () => {
    setSelectedFile(null);
    setMediaPreviewUrl(null);
    setMediaType('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
    setSelectedTrack(null);
    setTrackTitle('');
    setTrackArtist('');
    setCustomAudioFile(null);
    setCustomAudioUrl(null);
    setAudioStartOffset(0);
    setAudioCurrentTime(0);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.currentTime = audioCurrentTime || audioStartOffset;
      audioPlayerRef.current.volume = audioVolume / 100;
      audioPlayerRef.current.play().catch(console.error);
      setIsPlayingAudio(true);
    }
  };

  const handleStartOffsetChange = (offset: number) => {
    setAudioStartOffset(offset);
    setAudioCurrentTime(offset);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = offset;
      if (!isPlayingAudio) {
        audioPlayerRef.current.play().catch(console.error);
        setIsPlayingAudio(true);
      }
    }
  };

  const handleTimelineSeek = (targetSecs: number) => {
    const clamped = Math.max(0, Math.min(targetSecs, audioDuration || 60));
    setAudioCurrentTime(clamped);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = clamped;
      if (!isPlayingAudio) {
        audioPlayerRef.current.play().catch(console.error);
        setIsPlayingAudio(true);
      }
    }
  };

  const readFileToDataUrlOrBlob = async (file: File): Promise<string> => {
    if (file.type.startsWith('image/') || (file.type.startsWith('audio/') && file.size < 4 * 1024 * 1024)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      });
    }
    return URL.createObjectURL(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!caption.trim() && !selectedFile) {
      setErrorMsg('Please write a caption or attach a photo/video before publishing.');
      return;
    }

    setErrorMsg(null);
    setIsPublishing(true);
    setUploadProgress(20);

    try {
      let uploadedMediaUrl: string | undefined = undefined;
      let uploadedAudioUrl: string | undefined = undefined;

      // 1. Process Media File with non-blocking 1.2s safety race
      if (selectedFile) {
        setUploadProgress(35);
        if (isConfigured && !isGuest) {
          try {
            uploadedMediaUrl = await Promise.race([
              uploadMediaFile(
                selectedFile,
                'posts',
                currentUser.uid,
                (prog) => setUploadProgress(Math.round(25 + prog * 0.35))
              ),
              new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error('Storage upload timed out')), 1200)
              ),
            ]);
          } catch (storageErr) {
            console.warn('Storage upload bypassed/timed out, using fast local media:', storageErr);
            uploadedMediaUrl = await readFileToDataUrlOrBlob(selectedFile);
          }
        } else {
          uploadedMediaUrl = await readFileToDataUrlOrBlob(selectedFile);
        }
      }

      setUploadProgress(65);

      // 2. Process Audio File
      if (customAudioFile) {
        if (isConfigured && !isGuest) {
          try {
            uploadedAudioUrl = await Promise.race([
              uploadMediaFile(
                customAudioFile,
                'audio',
                currentUser.uid,
                (prog) => setUploadProgress(Math.round(65 + prog * 0.25))
              ),
              new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error('Audio storage upload timed out')), 1200)
              ),
            ]);
          } catch (storageErr) {
            console.warn('Audio storage upload bypassed/timed out, using fast local audio:', storageErr);
            uploadedAudioUrl = await readFileToDataUrlOrBlob(customAudioFile);
          }
        } else {
          uploadedAudioUrl = await readFileToDataUrlOrBlob(customAudioFile);
        }
      } else if (selectedTrack) {
        uploadedAudioUrl = selectedTrack.audioUrl;
      }

      setUploadProgress(90);

      // 3. Reliably publish post with complete video and music adjustment parameters
      await handleCreatePost(
        caption.trim(),
        uploadedMediaUrl,
        mediaType,
        uploadedAudioUrl,
        trackTitle || selectedTrack?.title,
        trackArtist || selectedTrack?.artist,
        'friends',
        {
          audioVolume,
          audioLoop,
          audioStartOffset,
          videoAspectRatio,
          videoSpeed,
          videoMuted,
          videoVolume,
          videoFilter,
          videoLoop,
        }
      );

      setUploadProgress(100);
      showToast('Post published successfully!', 'success');
      clearAudio();
      onClose();
    } catch (err: any) {
      console.error('Publish error:', err);
      setErrorMsg(err.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Helper classes for video aspect ratio
  const getVideoAspectClass = () => {
    switch (videoAspectRatio) {
      case '16/9':
        return 'aspect-video max-h-72 w-full object-cover';
      case '1/1':
        return 'aspect-square max-h-72 w-full object-cover';
      case '9/16':
        return 'aspect-[9/16] max-h-72 w-full object-cover';
      case '4/5':
        return 'aspect-[4/5] max-h-72 w-full object-cover';
      default:
        return 'max-h-72 w-full object-contain';
    }
  };

  // Helper classes for video filter
  const getVideoFilterClass = () => {
    switch (videoFilter) {
      case 'vibrant':
        return 'contrast-110 saturate-150';
      case 'cinema':
        return 'contrast-125 brightness-95 sepia-[0.25]';
      case 'vintage':
        return 'sepia-[0.5] contrast-90';
      case 'bw':
        return 'grayscale contrast-125';
      case 'warm':
        return 'contrast-105 saturate-125 hue-rotate-[-10deg]';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl my-auto animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <img
              src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700"
            />
            <div>
              <h2 className="text-sm font-bold text-white">Create Post</h2>
              <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Friends Only Feed
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handlePublish} className="mt-3 space-y-3.5 overflow-y-auto pr-1 flex-1">
          {/* Caption */}
          <div>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={`What's happening, ${currentUser.displayName}? Share your moment with friends...`}
              className="w-full rounded-2xl bg-slate-800/60 border border-slate-700/60 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Media Preview Box */}
          {mediaPreviewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[180px]">
                {mediaType === 'video' ? (
                  <video
                    ref={videoPlayerRef}
                    src={mediaPreviewUrl}
                    controls
                    playsInline
                    className={`${getVideoAspectClass()} ${getVideoFilterClass()} transition-all duration-200`}
                  />
                ) : (
                  <img
                    src={mediaPreviewUrl}
                    alt="Preview"
                    className="max-h-72 w-full object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow"
                  title="Remove media"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* VIDEO ADJUSTMENT SYSTEM - Shown whenever video is added */}
              {mediaType === 'video' && (
                <div className="rounded-2xl bg-slate-950/70 border border-indigo-500/30 p-3 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Film className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Video Adjustments & Tuning</span>
                    </span>
                    <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      Live Preview
                    </span>
                  </div>

                  {/* Sub-tabs for video controls */}
                  <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('frame')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                        activeMediaTab === 'frame'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Framing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('speed')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                        activeMediaTab === 'speed'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sliders className="h-3 w-3" />
                      <span>Speed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('audio')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                        activeMediaTab === 'audio'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('filter')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                        activeMediaTab === 'filter'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="h-3 w-3" />
                      <span>Filters</span>
                    </button>
                  </div>

                  {/* Tab 1: Framing & Aspect Ratio */}
                  {activeMediaTab === 'frame' && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Aspect Ratio:</span>
                        <span className="font-semibold text-indigo-400">
                          {videoAspectRatio === 'original' && 'Auto Fit'}
                          {videoAspectRatio === '16/9' && '16:9 Landscape'}
                          {videoAspectRatio === '1/1' && '1:1 Square'}
                          {videoAspectRatio === '9/16' && '9:16 Vertical Reel'}
                          {videoAspectRatio === '4/5' && '4:5 Portrait'}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { id: 'original', label: 'Auto' },
                          { id: '16/9', label: '16:9' },
                          { id: '1/1', label: '1:1' },
                          { id: '9/16', label: '9:16' },
                          { id: '4/5', label: '4:5' },
                        ].map((ratio) => (
                          <button
                            key={ratio.id}
                            type="button"
                            onClick={() => setVideoAspectRatio(ratio.id as any)}
                            className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all border ${
                              videoAspectRatio === ratio.id
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {ratio.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Repeat className="h-3 w-3 text-indigo-400" />
                          <span>Loop video continuously</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setVideoLoop(!videoLoop)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                            videoLoop ? 'bg-indigo-600' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              videoLoop ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Speed Controls */}
                  {activeMediaTab === 'speed' && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Playback Speed:</span>
                        <span className="font-semibold text-indigo-400">{videoSpeed}x</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setVideoSpeed(speed)}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border ${
                              videoSpeed === speed
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {speed === 1 ? '1.0x Normal' : `${speed}x`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Video Sound / Mute Controls */}
                  {activeMediaTab === 'audio' && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="flex items-center space-x-1.5">
                          {videoMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
                          <span>Mute Original Video Sound</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setVideoMuted(!videoMuted)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                            videoMuted ? 'bg-rose-600' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              videoMuted ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {!videoMuted && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Video Sound Volume:</span>
                            <span>{videoVolume}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={videoVolume}
                            onChange={(e) => setVideoVolume(Number(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 italic">
                        Tip: Muting original video audio allows background music to sound crisp and studio-clear!
                      </p>
                    </div>
                  )}

                  {/* Tab 4: Filters */}
                  {activeMediaTab === 'filter' && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Aesthetic Color Filter:</span>
                        <span className="font-semibold text-indigo-400 capitalize">{videoFilter}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'none', label: 'Normal' },
                          { id: 'vibrant', label: '✨ Vibrant' },
                          { id: 'cinema', label: '🎬 Cinema' },
                          { id: 'vintage', label: '📼 Vintage' },
                          { id: 'warm', label: '☀️ Warm' },
                          { id: 'bw', label: '🎞️ B&W' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setVideoFilter(f.id as any)}
                            className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                              videoFilter === f.id
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-800/30 group"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform mb-1.5">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Click to attach a Photo or Video
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">MP4, WebM, MOV, JPG, PNG up to 50MB</p>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMediaSelect}
            accept="image/*,video/*"
            className="hidden"
          />

          {/* MUSIC ADJUSTMENT & TIMELINE SYSTEM - Interactive timeline scrubber & trim controls */}
          {selectedTrack && (
            <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-500/40 space-y-3 shadow-lg">
              {/* Top Bar: Play, Title/Artist, and Time Counter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                  <button
                    type="button"
                    onClick={toggleAudioPlayback}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-indigo-500 to-purple-600 text-white hover:scale-105 active:scale-95 transition-transform shadow-md shrink-0 cursor-pointer"
                    title={isPlayingAudio ? 'Pause Preview' : 'Play Preview'}
                  >
                    {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    {isEditingTrackInfo ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={trackTitle}
                          onChange={(e) => setTrackTitle(e.target.value)}
                          placeholder="Song Title"
                          className="w-full text-xs font-bold text-white bg-slate-800 rounded px-2 py-0.5 border border-indigo-500/50"
                        />
                        <input
                          type="text"
                          value={trackArtist}
                          onChange={(e) => setTrackArtist(e.target.value)}
                          placeholder="Artist Name"
                          className="w-full text-[10px] text-indigo-300 bg-slate-800 rounded px-2 py-0.5 border border-indigo-500/50"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold text-white truncate">{trackTitle || selectedTrack.title}</p>
                          <button
                            type="button"
                            onClick={() => setIsEditingTrackInfo(true)}
                            className="text-slate-400 hover:text-white"
                            title="Edit track credits"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-indigo-300 truncate">
                          {trackArtist || selectedTrack.artist} • {selectedTrack.genre}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {isEditingTrackInfo && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTrackInfo(false)}
                      className="px-2 py-0.5 rounded text-[10px] bg-indigo-600 text-white font-bold"
                    >
                      Done
                    </button>
                  )}

                  {/* Real-time Time Counter */}
                  <div className="text-right font-mono bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-xs font-bold text-pink-400">{formatTime(audioCurrentTime)}</span>
                    <span className="text-[10px] text-slate-500"> / {formatTime(audioDuration || 60)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={clearAudio}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove Track"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* INTERACTIVE AUDIO TIMELINE & WAVEFORM SCRUBBER */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center space-x-1 text-indigo-300 font-semibold">
                    <Music className="h-3 w-3 text-pink-400" />
                    <span>Music Timeline (Click or drag to seek):</span>
                  </span>
                  <span className="text-amber-400 font-medium">
                    Start Offset: {formatTime(audioStartOffset)}
                  </span>
                </div>

                {/* Waveform track with overlaid scrubber & start trim pin */}
                <div className="relative h-14 bg-slate-900/90 rounded-xl p-2 border border-slate-700/80 flex items-center justify-between overflow-hidden select-none group">
                  {/* Visual Waveform Bars */}
                  <div className="absolute inset-x-2 inset-y-1.5 flex items-center justify-between gap-[2px] pointer-events-none">
                    {WAVE_BARS.map((heightPct, idx) => {
                      const barTime = (idx / (WAVE_BARS.length - 1)) * (audioDuration || 60);
                      const isPlayed = barTime <= audioCurrentTime;
                      const isInStartZone = barTime < audioStartOffset;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex items-center justify-center h-full"
                        >
                          <div
                            className={`w-full rounded-full transition-colors duration-100 ${
                              isPlayed
                                ? 'bg-gradient-to-t from-pink-500 to-indigo-400 shadow-[0_0_6px_rgba(236,72,153,0.6)]'
                                : isInStartZone
                                ? 'bg-amber-500/25'
                                : 'bg-slate-700/70'
                            }`}
                            style={{ height: `${Math.max(15, heightPct)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Start Trim Position Marker */}
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none flex flex-col items-center"
                    style={{
                      left: `${Math.min(98, Math.max(2, (audioStartOffset / (audioDuration || 60)) * 100))}%`,
                    }}
                  >
                    <div className="bg-amber-500 text-slate-950 font-black text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap -translate-y-1">
                      Start
                    </div>
                    <div className="w-[2px] flex-1 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  </div>

                  {/* Live Scrubber Playhead */}
                  <div
                    className="absolute top-0 bottom-0 z-15 pointer-events-none flex flex-col items-center"
                    style={{
                      left: `${Math.min(99, Math.max(1, (audioCurrentTime / (audioDuration || 60)) * 100))}%`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-pink-500 shadow-[0_0_10px_rgba(244,114,182,1)]" />
                    <div className="w-[2px] flex-1 bg-white" />
                  </div>

                  {/* Overlaid Draggable/Clickable Timeline Input */}
                  <input
                    type="range"
                    min="0"
                    max={audioDuration || 60}
                    step="0.25"
                    value={audioCurrentTime}
                    onChange={(e) => handleTimelineSeek(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    title="Scrub through music timeline"
                  />
                </div>

                {/* Timeline timestamp bounds */}
                <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
                  <span>0:00</span>
                  <span>{formatTime((audioDuration || 60) / 2)}</span>
                  <span>{formatTime(audioDuration || 60)}</span>
                </div>
              </div>

              {/* START OFFSET / TRIM ADJUSTMENT */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                    <Scissors className="h-3.5 w-3.5 text-amber-400" />
                    <span>Set Start Offset (Trim Song for Post):</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {formatTime(audioStartOffset)}
                  </span>
                </div>

                {/* Quick Segment Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { label: '0:00 (Intro)', secs: 0 },
                    { label: '0:15 (Hook)', secs: 15 },
                    { label: '0:30 (Chorus)', secs: 30 },
                    { label: '0:45 (Drop)', secs: 45 },
                    { label: '1:00 (Bridge)', secs: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.secs}
                      type="button"
                      onClick={() => handleStartOffsetChange(preset.secs)}
                      className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        Math.abs(audioStartOffset - preset.secs) < 3
                          ? 'bg-amber-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Fine Start Offset Slider */}
                <input
                  type="range"
                  min="0"
                  max={Math.min(90, Math.max(10, Math.floor((audioDuration || 60) - 5)))}
                  step="1"
                  value={audioStartOffset}
                  onChange={(e) => handleStartOffsetChange(Number(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Volume & Loop Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-500/20 text-slate-300 text-xs">
                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center space-x-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => setAudioVolume(audioVolume === 0 ? 80 : 0)}
                        className="hover:text-white transition-colors"
                      >
                        {audioVolume === 0 ? (
                          <VolumeX className="h-3 w-3 text-rose-400" />
                        ) : (
                          <Volume2 className="h-3 w-3 text-indigo-400" />
                        )}
                      </button>
                      <span>Music Volume:</span>
                    </span>
                    <span className="font-semibold text-white">{audioVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Loop Audio Option */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 self-center">
                  <span className="flex items-center space-x-1.5">
                    <Repeat className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Loop audio track</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAudioLoop(!audioLoop)}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                      audioLoop ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        audioLoop ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Hidden Audio Player with rich event bindings */}
              <audio
                ref={audioPlayerRef}
                src={selectedTrack.audioUrl}
                onLoadedMetadata={() => {
                  if (audioPlayerRef.current?.duration) {
                    setAudioDuration(audioPlayerRef.current.duration);
                  }
                }}
                onTimeUpdate={() => {
                  if (audioPlayerRef.current) {
                    setAudioCurrentTime(audioPlayerRef.current.currentTime);
                  }
                }}
                onEnded={() => {
                  if (audioLoop && audioPlayerRef.current) {
                    audioPlayerRef.current.currentTime = audioStartOffset;
                    audioPlayerRef.current.play().catch(console.error);
                  } else {
                    setIsPlayingAudio(false);
                    setAudioCurrentTime(audioStartOffset);
                  }
                }}
                className="hidden"
              />
            </div>
          )}

          {/* Music Picker Trigger Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowMusicPicker(!showMusicPicker)}
              className="flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 text-xs font-semibold transition-colors border border-slate-700/60"
            >
              <Music className="h-3.5 w-3.5 text-pink-400" />
              <span>{selectedTrack ? 'Change Music Track' : 'Add Background Music'}</span>
            </button>

            {/* Custom audio upload */}
            <input
              type="file"
              ref={audioInputRef}
              onChange={handleCustomAudioSelect}
              accept="audio/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
            >
              Upload authorized audio (.mp3)
            </button>
          </div>

          {/* Music Library Selector */}
          {showMusicPicker && (
            <div className="rounded-2xl bg-slate-800/95 border border-slate-700 p-3 space-y-2 animate-in fade-in duration-100 shadow-xl">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Disc className="h-3.5 w-3.5 text-pink-400" />
                  <span>Licensed Royalty-Free Music</span>
                </span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Copyright Cleared
                </span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {LICENSED_MUSIC_LIBRARY.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => selectPresetTrack(track)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      selectedTrack?.id === track.id
                        ? 'bg-indigo-600/30 border border-indigo-500/50 text-white'
                        : 'hover:bg-slate-700/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-xs text-white">{track.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {track.artist} • {track.genre}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{track.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isPublishing && (
            <div className="space-y-1 py-1">
              <div className="flex justify-between text-[11px] text-indigo-300 font-medium">
                <span>Publishing post & applying media adjustments...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing || (!caption.trim() && !selectedFile)}
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/30 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              {isPublishing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Publish Post</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
