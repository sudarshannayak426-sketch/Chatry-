import {
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getUserProfile } from '../firebase/firebaseService';
import { uploadMediaFile } from '../firebase/storageService';
import { useToast } from '../context/ToastContext';
import { ChatMessage, UserProfile } from '../types';

interface ChatRoomProps {
  onBack: () => void;
  onViewUserProfile: (user: UserProfile) => void;
}

const QUICK_EMOJIS = ['😄', '❤️', '👍', '🔥', '😂', '🎉', '✨', '🙌', '💯', '👋'];

export const ChatRoom: React.FC<ChatRoomProps> = ({ onBack, onViewUserProfile }) => {
  const { currentUser } = useAuth();
  const { activeConversation, messages, sendMessage } = useChat();
  const { showToast } = useToast();

  const [inputText, setInputText] = useState('');
  const [partnerUser, setPartnerUser] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partnerId = activeConversation?.participants.find((id) => id !== currentUser?.uid) || '';

  useEffect(() => {
    if (partnerId) {
      getUserProfile(partnerId).then((p) => {
        if (p) setPartnerUser(p);
      });
    }
  }, [partnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeConversation || !currentUser) return null;

  const partnerDetails = activeConversation.participantDetails?.[partnerId] || {
    displayName: partnerUser?.displayName || 'Friend',
    username: partnerUser?.username || 'user',
    photoURL: partnerUser?.photoURL || '',
    isOnline: partnerUser?.isOnline || false,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    try {
      setIsUploading(true);
      let mediaUrl: string | undefined = undefined;
      let mediaType: 'image' | 'video' = 'image';

      if (selectedFile) {
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
        mediaUrl = await uploadMediaFile(selectedFile, 'chat_media', currentUser.uid);
      }

      await sendMessage(inputText.trim(), mediaUrl, mediaType);
      setInputText('');
      clearAttachment();
      setShowEmojiPicker(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatMsgTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 max-w-xl mx-auto w-full">
      {/* Top Header matching mockup Screen 9 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div
            onClick={() => partnerUser && onViewUserProfile(partnerUser)}
            className="flex items-center space-x-2.5 cursor-pointer"
          >
            <div className="relative">
              <img
                src={partnerUser?.photoURL || partnerDetails.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${partnerDetails.username}`}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              {(partnerUser?.isOnline ?? partnerDetails.isOnline) && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-white hover:text-indigo-300 transition-colors">
                {partnerUser?.displayName || partnerDetails.displayName}
              </h3>
              <p className="text-[10px] text-emerald-400 font-medium">
                {(partnerUser?.isOnline ?? partnerDetails.isOnline) ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons matching mockup */}
        <div className="flex items-center space-x-2 text-slate-400">
          <button
            onClick={() => showToast(`Calling ${partnerDetails.displayName}...`, 'info')}
            className="p-2 rounded-full hover:bg-slate-800 hover:text-white transition-colors"
            title="Audio Call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => showToast(`Video call with ${partnerDetails.displayName}...`, 'info')}
            className="p-2 rounded-full hover:bg-slate-800 hover:text-white transition-colors"
            title="Video Call"
          >
            <Video className="h-4 w-4" />
          </button>
          <button
            onClick={() => partnerUser && onViewUserProfile(partnerUser)}
            className="p-2 rounded-full hover:bg-slate-800 hover:text-white transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Thread matching mockup */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
              <Smile className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Start of your private conversation with {partnerDetails.displayName}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Messages are encrypted and accessible only to accepted friends.
            </p>
          </div>
        ) : (
          messages.map((msg: ChatMessage) => {
            const isMe = msg.senderId === currentUser.uid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end space-x-1.5 max-w-[80%]">
                  {!isMe && (
                    <img
                      src={msg.senderPhoto || partnerDetails.photoURL}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover shrink-0 mb-1"
                    />
                  )}

                  {/* Message Bubble matching mockup */}
                  <div
                    className={`rounded-2xl px-4 py-2 text-xs shadow-md break-words ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden bg-slate-950">
                        {msg.mediaType === 'video' ? (
                          <video src={msg.mediaUrl} controls className="max-h-60 w-full" />
                        ) : (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="max-h-60 w-full object-cover rounded-lg hover:opacity-95 transition-opacity"
                            />
                          </a>
                        )}
                      </div>
                    )}

                    {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                    <div
                      className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${
                        isMe ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatMsgTime(msg.timestamp)}</span>
                      {isMe && <CheckCheck className="h-3 w-3 inline text-cyan-300" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview if selected */}
      {mediaPreview && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={mediaPreview} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <span className="text-xs text-slate-300 truncate max-w-xs">{selectedFile?.name}</span>
          </div>
          <button onClick={clearAttachment} className="p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Emoji Drawer */}
      {showEmojiPicker && (
        <div className="p-2 border-t border-slate-800 bg-slate-900 flex items-center justify-around">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setInputText((prev) => prev + em)}
              className="text-lg hover:scale-125 transition-transform"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Bar matching mockup Screen 9 */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-slate-800 bg-slate-900 flex items-center space-x-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-slate-400 hover:text-amber-400 p-1.5 transition-colors"
        >
          <Smile className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-slate-800 border border-slate-700/60 px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-indigo-400 p-1.5 transition-colors"
          title="Attach photo/video"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <button
          type="submit"
          disabled={isUploading || (!inputText.trim() && !selectedFile)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
