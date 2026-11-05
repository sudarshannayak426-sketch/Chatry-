import {
  AlertCircle,
  Check,
  Cloud,
  Code,
  Copy,
  ExternalLink,
  Flame,
  HelpCircle,
  Key,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  clearFirebaseConfig,
  getActiveFirebaseConfig,
  getMissingConfigFields,
  isFirebaseConfigured,
  saveFirebaseConfig,
  testFirestoreConnection,
} from '../firebase/config';
import { FirebaseClientConfig } from '../types';
import { useToast } from '../context/ToastContext';

interface FirebaseSetupModalProps {
  onClose: () => void;
}

const FIRESTORE_RULES_CONTENT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    // Users
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
    }

    // Unique usernames index
    match /usernames/{username} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
    }

    // Friend Requests
    match /friend_requests/{requestId} {
      allow read: if isSignedIn() && (
        resource.data.senderId == request.auth.uid ||
        resource.data.receiverId == request.auth.uid
      );
      allow create: if isSignedIn() && request.resource.data.senderId == request.auth.uid;
      allow update, delete: if isSignedIn() && (
        resource.data.senderId == request.auth.uid ||
        resource.data.receiverId == request.auth.uid
      );
    }

    // Accepted Friends (ACID relationship)
    match /friends/{relationId} {
      allow read: if isSignedIn() && (
        resource.data.user1Id == request.auth.uid ||
        resource.data.user2Id == request.auth.uid
      );
      allow create, delete: if isSignedIn() && (
        request.resource.data.user1Id == request.auth.uid ||
        request.resource.data.user2Id == request.auth.uid ||
        resource.data.user1Id == request.auth.uid ||
        resource.data.user2Id == request.auth.uid
      );
    }

    // Friends-Only Posts
    match /posts/{postId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn() && (
        resource.data.authorId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes', 'commentsCount'])
      );
      allow delete: if isSignedIn() && resource.data.authorId == request.auth.uid;

      match /comments/{commentId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      }
    }

    // One-to-One Conversations (Backend-enforced)
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && (
        request.auth.uid in resource.data.participants
      );
      allow create: if isSignedIn() && (
        request.auth.uid in request.resource.data.participants
      );
      allow update: if isSignedIn() && (
        request.auth.uid in resource.data.participants
      );

      match /messages/{messageId} {
        allow read: if isSignedIn() && (
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants
        );
        allow create: if isSignedIn() && (
          request.resource.data.senderId == request.auth.uid &&
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants
        );
      }
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read: if isSignedIn() && resource.data.recipientId == request.auth.uid;
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && resource.data.recipientId == request.auth.uid;
    }

    // User reports
    match /reports/{reportId} {
      allow create: if isSignedIn();
    }
  }
}`;

const STORAGE_RULES_CONTENT = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} { allow read, write: if false; }

    // User Avatars: max 5MB image
    match /avatars/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    // Post Photos and Videos: max 50MB
    match /posts/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 50 * 1024 * 1024
        && (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('video/.*'));
    }

    // Chat Media: images & videos
    match /chat_media/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 25 * 1024 * 1024
        && (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('video/.*'));
    }

    // Custom Authorized Audio: max 15MB audio
    match /audio/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 15 * 1024 * 1024
        && request.resource.contentType.matches('audio/.*');
    }
  }
}`;

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const currentConfig = getActiveFirebaseConfig();
  const isConfigured = isFirebaseConfigured();
  const missing = getMissingConfigFields();

  const [activeTab, setActiveTab] = useState<'status' | 'credentials' | 'guide' | 'rules'>('status');

  // Input states
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [rawSnippet, setRawSnippet] = useState('');

  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleLoadTemplate = () => {
    const templateSnippet = `const firebaseConfig = {
  apiKey: "AIzaSyC_YourApiKeyHere1234567890",
  authDomain: "chatry-app-demo.firebaseapp.com",
  projectId: "chatry-app-demo",
  storageBucket: "chatry-app-demo.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};`;
    setRawSnippet(templateSnippet);
    parseSnippetContent(templateSnippet);
    showToast('Loaded example template! Update with your real Firebase keys when ready.', 'info');
  };

  const parseSnippetContent = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      showToast('Please paste your Firebase configuration snippet first.', 'info');
      return;
    }

    let extractedApiKey = '';
    let extractedProjectId = '';
    let extractedAuthDomain = '';
    let extractedStorageBucket = '';
    let extractedAppId = '';
    let extractedMessagingSenderId = '';

    // 1. Try strict JSON parse or substring JSON parse
    try {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Handle Android google-services.json format
        if (parsed.project_info) {
          extractedProjectId = parsed.project_info.project_id || '';
          extractedStorageBucket = parsed.project_info.storage_bucket || '';
          extractedMessagingSenderId = parsed.project_info.project_number || '';
        }
        if (Array.isArray(parsed.client) && parsed.client.length > 0) {
          const client0 = parsed.client[0];
          extractedAppId = client0?.client_info?.mobilesdk_app_id || '';
          if (Array.isArray(client0?.api_key) && client0.api_key.length > 0) {
            extractedApiKey = client0.api_key[0]?.current_key || '';
          }
        }
        // Handle standard web config JSON
        if (parsed.apiKey) extractedApiKey = parsed.apiKey;
        if (parsed.projectId) extractedProjectId = parsed.projectId;
        if (parsed.authDomain) extractedAuthDomain = parsed.authDomain;
        if (parsed.storageBucket) extractedStorageBucket = parsed.storageBucket;
        if (parsed.appId) extractedAppId = parsed.appId;
        if (parsed.messagingSenderId) extractedMessagingSenderId = parsed.messagingSenderId;
      }
    } catch {
      // Ignore strict JSON failure; regex handles JavaScript objects and .env formats
    }

    // 2. Multi-field regex parser for JS objects, .env syntax, and console copy-pastes
    const findField = (fieldNames: string[]): string => {
      for (const name of fieldNames) {
        const regex = new RegExp(`['"]?${name}['"]?\\s*[:=]\\s*["'\`]?([^"'\\n\\r,;}\\s]+)["'\`]?`, 'i');
        const match = trimmed.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return '';
    };

    if (!extractedApiKey) extractedApiKey = findField(['apiKey', 'api_key', 'current_key', 'VITE_FIREBASE_API_KEY', 'API_KEY']);
    if (!extractedProjectId) extractedProjectId = findField(['projectId', 'project_id', 'VITE_FIREBASE_PROJECT_ID', 'PROJECT_ID']);
    if (!extractedAuthDomain) extractedAuthDomain = findField(['authDomain', 'auth_domain', 'VITE_FIREBASE_AUTH_DOMAIN', 'AUTH_DOMAIN']);
    if (!extractedStorageBucket) extractedStorageBucket = findField(['storageBucket', 'storage_bucket', 'VITE_FIREBASE_STORAGE_BUCKET', 'STORAGE_BUCKET']);
    if (!extractedAppId) extractedAppId = findField(['appId', 'app_id', 'mobilesdk_app_id', 'VITE_FIREBASE_APP_ID', 'APP_ID']);
    if (!extractedMessagingSenderId) extractedMessagingSenderId = findField(['messagingSenderId', 'messaging_sender_id', 'project_number', 'VITE_FIREBASE_MESSAGING_SENDER_ID']);

    // 3. Pattern heuristics
    if (!extractedApiKey) {
      const keyMatch = trimmed.match(/AIzaSy[A-Za-z0-9_-]{33}/);
      if (keyMatch) extractedApiKey = keyMatch[0];
    }

    if (!extractedProjectId) {
      const projMatch = trimmed.match(/([a-z0-9-]+)\.firebaseapp\.com/i) || trimmed.match(/([a-z0-9-]+)\.(appspot\.com|firebasestorage\.app)/i);
      if (projMatch) extractedProjectId = projMatch[1];
    }

    if (!extractedAuthDomain && extractedProjectId) {
      extractedAuthDomain = `${extractedProjectId}.firebaseapp.com`;
    }

    if (!extractedStorageBucket && extractedProjectId) {
      extractedStorageBucket = `${extractedProjectId}.firebasestorage.app`;
    }

    if (!extractedAppId) {
      const appMatch = trimmed.match(/1:\d+:[a-z]+:[a-f0-9]+/i);
      if (appMatch) extractedAppId = appMatch[0];
    }

    if (extractedApiKey) setApiKey(extractedApiKey);
    if (extractedProjectId) setProjectId(extractedProjectId);
    if (extractedAuthDomain) setAuthDomain(extractedAuthDomain);
    if (extractedStorageBucket) setStorageBucket(extractedStorageBucket);
    if (extractedAppId) setAppId(extractedAppId);
    if (extractedMessagingSenderId) setMessagingSenderId(extractedMessagingSenderId);

    if (extractedApiKey || extractedProjectId) {
      showToast('Firebase configuration successfully parsed & auto-filled!', 'success');
    } else {
      showToast('Could not extract credentials. Please ensure snippet contains apiKey and projectId.', 'error');
    }
  };

  const handleAutoParseSnippet = () => {
    parseSnippetContent(rawSnippet);
  };

  const handleSaveCredentials = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      showToast('API Key and Project ID are required.', 'error');
      return;
    }

    const newCfg: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveFirebaseConfig(newCfg);
    window.location.reload();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(null);
    const res = await testFirestoreConnection();
    setTesting(false);
    setTestStatus(res);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Firebase Backend Integration</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isConfigured ? 'LIVE FIREBASE CONNECTED' : 'KEYS REQUIRED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real Authentication, Cloud Firestore, and Firebase Storage configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 my-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'status' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'credentials' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Enter Keys
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'guide' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Step-by-Step Setup
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'rules' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Rules
          </button>
        </div>

        {/* TAB 1: STATUS */}
        {activeTab === 'status' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Server className="h-4 w-4 text-indigo-400" />
                  <span>Connection Status</span>
                </span>
                <span
                  className={`font-semibold ${
                    isConfigured ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isConfigured ? 'Ready & Connected' : 'Missing Configuration'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {isConfigured
                  ? `Chatry is hooked up to live Firebase Project: "${currentConfig?.projectId}". Real accounts, friends-only feeds, and direct chats are synced to Cloud Firestore.`
                  : `Firebase keys are required for real accounts and media uploads. Currently missing: ${missing.join(', ')}.`}
              </p>

              {isConfigured && (
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 font-semibold transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>{testing ? 'Testing connection...' : 'Test Connection'}</span>
                  </button>
                  {testStatus && (
                    <span
                      className={`font-medium ${
                        testStatus.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {testStatus.message}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Services overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
                <h4 className="font-bold text-white mb-1">Firebase Auth</h4>
                <p className="text-[11px] text-slate-400">
                  Email/Password, Google Sign-In with popup, and Anonymous guest sessions.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
                <h4 className="font-bold text-white mb-1">Cloud Firestore</h4>
                <p className="text-[11px] text-slate-400">
                  Real-time database enforcing friends-only read isolation and unique usernames.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800">
                <h4 className="font-bold text-white mb-1">Firebase Storage</h4>
                <p className="text-[11px] text-slate-400">
                  Bucket uploads for user avatars, photos, videos, and custom music tracks.
                </p>
              </div>
            </div>

            {/* Google Sign-in & API Key Troubleshooting Card */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                <h4 className="font-bold text-white text-xs">
                  Fixing "Firebase: Error (auth/api-key-not-valid)" with Google Login
                </h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When Google Sign-In says <em>"auth/api-key-not-valid.-please-pass-a-valid-api-key"</em>, it means the app is using placeholder credentials or an invalid project key.
              </p>
              <div className="bg-slate-950/70 rounded-xl p-2.5 text-[11px] space-y-1.5 text-slate-300">
                <p className="font-semibold text-indigo-300">How to get a valid API Key in 2 minutes:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Visit <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-medium">console.firebase.google.com</a> and create/select a project.</li>
                  <li>Go to <strong>Authentication &gt; Sign-in method</strong> &gt; enable <strong>Google</strong>.</li>
                  <li>In <strong>Authentication &gt; Settings &gt; Authorized domains</strong>, add <code className="text-amber-300 font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'current domain'}</code>.</li>
                  <li>Under <strong>Project settings &gt; General &gt; Your apps &gt; Web (&#60;/&#62;)</strong>, copy your <code className="text-indigo-300 font-mono">firebaseConfig</code> snippet and paste it into the <strong>Enter Keys</strong> tab!</li>
                </ol>
              </div>
            </div>

            {isConfigured && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Encountering credential errors? You can clear saved keys and return to Guest mode:
                </span>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer shrink-0 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Saved Keys</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[11px] text-rose-300 font-medium">Clear keys?</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearFirebaseConfig();
                        showToast('Firebase credentials cleared. Switched to guest mode.', 'info');
                        window.location.reload();
                      }}
                      className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREDENTIALS */}
        {activeTab === 'credentials' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            {/* Google Login & API Key explanation banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-amber-200">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-amber-400 shrink-0" />
                <h4 className="font-bold text-xs text-amber-300">About the "API Key / Pass Key"</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                In Google Firebase, an <strong>API Key</strong> is not a secret personal password or passkey. It is the public web identifier (beginning with <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-300 font-mono">AIzaSy...</code>) generated in your Google Firebase Console that links this frontend to your Firebase project.
              </p>
            </div>

            {/* JSON / JS Auto-parser */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-indigo-300">
                  Quick Auto-Fill from Firebase Web Config
                </label>
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:text-white underline flex items-center space-x-1"
                >
                  <span>Open Firebase Console</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Paste your <code className="text-indigo-300 font-mono">const firebaseConfig = &#123; ... &#125;</code> code block directly from Firebase Console &gt; Project Settings &gt; General &gt; Your apps. Works with JavaScript syntax, JSON, and .env formats!
              </p>
              <textarea
                rows={3}
                value={rawSnippet}
                onChange={(e) => setRawSnippet(e.target.value)}
                placeholder={"Paste code snippet here, e.g.:\nconst firebaseConfig = {\n  apiKey: \"AIzaSy...\",\n  projectId: \"my-app-12345\",\n  ...\n};"}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLoadTemplate}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 text-[11px] font-semibold border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Code className="h-3 w-3 text-indigo-400" />
                  <span>Load Sample Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoParseSnippet}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Parse &amp; Auto-Fill Credentials</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  apiKey *
                </label>
                <input
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  projectId *
                </label>
                <input
                  type="text"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="my-chatry-app"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  authDomain
                </label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="my-chatry-app.firebaseapp.com"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  storageBucket
                </label>
                <input
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="my-chatry-app.appspot.com"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  appId
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:1234567890:web:abcdef..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCredentials}
                className="flex items-center space-x-1.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-5 py-2.5 text-xs font-bold shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>Save Credentials & Reload</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: STEP-BY-STEP SETUP GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <h3 className="font-bold text-white flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Configuring Your Firebase Project</span>
              </h3>

              <ol className="list-decimal list-inside space-y-2.5 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-white">Create Firebase Project:</strong> Visit{' '}
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 underline inline-flex items-center space-x-0.5"
                  >
                    <span>console.firebase.google.com</span>
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>{' '}
                  and click "Add project".
                </li>
                <li>
                  <strong className="text-white">Enable Authentication Providers:</strong> Go to{' '}
                  <strong>Authentication &gt; Sign-in method</strong> and enable:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-400">
                    <li><strong className="text-slate-200">Email/Password</strong></li>
                    <li><strong className="text-slate-200">Google</strong> (select your project support email)</li>
                    <li><strong className="text-slate-200">Anonymous</strong> (for guest sessions)</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-white">Add Authorized Domains:</strong> Under{' '}
                  <strong>Authentication &gt; Settings &gt; Authorized domains</strong>, add:
                  <code className="block mt-1 p-1.5 rounded bg-slate-950 font-mono text-indigo-300">
                    localhost
                    <br />
                    ais-dev-dlgixwtsldeg3nxws7nvxs-158213972733.asia-east1.run.app
                  </code>
                </li>
                <li>
                  <strong className="text-white">Enable Cloud Firestore:</strong> Go to{' '}
                  <strong>Build &gt; Firestore Database</strong>, click "Create database", choose a region, and start in Test or Production mode.
                </li>
                <li>
                  <strong className="text-white">Enable Firebase Storage:</strong> Go to{' '}
                  <strong>Build &gt; Storage</strong> and click "Get started".
                </li>
                <li>
                  <strong className="text-white">Testing Two Separate Accounts:</strong>
                  <p className="mt-1 text-slate-400">
                    Open Chatry in a normal tab and an Incognito window. Sign up as <strong>User 1</strong> and <strong>User 2</strong>. User 1 searches User 2 by `@handle` or User ID, sends a friend request, User 2 accepts in "Follow Requests", and you can test real-time friends-only feed posts, music sharing, and real-time one-to-one messaging!
                  </p>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>firestore.rules (ABAC Friends Isolation)</span>
                </span>
                <button
                  onClick={() => handleCopy(FIRESTORE_RULES_CONTENT)}
                  className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {copiedRules ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedRules ? 'Copied' : 'Copy Rules'}</span>
                </button>
              </div>
              <pre className="rounded-2xl bg-slate-950 p-3 text-[10px] text-slate-300 font-mono overflow-x-auto border border-slate-800 max-h-48">
                {FIRESTORE_RULES_CONTENT}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>storage.rules (Media Size & MIME Guards)</span>
                </span>
                <button
                  onClick={() => handleCopy(STORAGE_RULES_CONTENT)}
                  className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Rules</span>
                </button>
              </div>
              <pre className="rounded-2xl bg-slate-950 p-3 text-[10px] text-slate-300 font-mono overflow-x-auto border border-slate-800 max-h-48">
                {STORAGE_RULES_CONTENT}
              </pre>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
              <p className="font-bold text-white mb-1">CLI Deployment Command:</p>
              <code className="block p-2 rounded-xl bg-slate-950 font-mono text-indigo-300">
                firebase deploy --only firestore:rules,storage
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
