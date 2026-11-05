# Chatry - Responsive Social Networking & Real-Time Messaging

Chatry is a real-time social networking and one-to-one messaging web application built with React, TypeScript, Tailwind CSS, and Firebase.

## Key Features

- **Authentication & User Management:**
  - Signup, login, and logout via Firebase Authentication or instant Sandbox mode.
  - Unique `@username` handles and searchable User IDs (`uid`).
  - Customizable profile: display name, avatar, bio, and status quote.
  - Active online presence indicators & last active timestamps.
  - Privacy controls: Public vs. Private accounts (with follow requests), direct messaging audience restrictions, and online status toggles.
  - User Safety: Block user and report abuse mechanisms.

- **Real-Time One-to-One Messaging:**
  - Real-time chat list with search, unread badge counters, and latest message snippet.
  - One-to-one messaging with timestamps and read receipts.
  - Real-time typing indicators ("Maya is typing...").
  - Emoji reactions under each message with multi-reactor counters.
  - Rich media attachments (photos and avatars stored in Firebase Storage).
  - Quick emoji drawer and image preview before sending.

- **Social Networking & Community:**
  - Follow / Unfollow system.
  - Follow requests workflow for private profiles with Accept and Reject actions.
  - Followers and Following lists with direct messaging shortcuts.
  - Discover page to search users by `@handle`, name, or User ID.
  - Social Feed ("Moments") with image attachments, heart likes, and comments.
  - Real-time notifications feed for new followers, follow requests, messages, and likes.

- **Security & Authorization:**
  - `firestore.rules`: ABAC-hardened rules ensuring users can only read messages from conversations they participate in and can only edit their own profiles.
  - `storage.rules`: Strict size (<5MB for avatars, <10MB for chat media) and MIME type validation (`image/*`).
  - `firebase-blueprint.json`: Standardized intermediate representation of all schemas and paths.
  - `security_spec.md`: Formal invariants and Dirty Dozen test suite specifications.

---

## Getting Started

### 1. Install Dependencies & Run Locally

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### 2. Firebase Setup & Configuration

Chatry supports both **Live Firebase Cloud** and **Interactive Sandbox Demo Mode**:

1. In the app, click the **Connect Firebase** button in the top navigation bar.
2. Under the **Enter Credentials** tab, enter your Firebase Web configuration:
   - `apiKey`
   - `projectId`
   - `authDomain`
   - `storageBucket`
   - `appId`
3. Click **Save & Connect Firebase**. The application will connect directly to your live project!

Alternatively, you can provide environment variables in a `.env` file:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 3. Deploying Security Rules

To deploy the production-hardened rules to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore and Storage
firebase init

# Deploy Firestore and Storage rules
firebase deploy --only firestore:rules,storage
```

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx             # Login, signup, and 1-click demo switcher
│   │   ├── BlockReportModal.tsx      # Block & report workflows
│   │   ├── ChatList.tsx              # Conversation list with unread counters
│   │   ├── ChatRoom.tsx              # Real-time chat with emojis, media & typing
│   │   ├── EditProfileModal.tsx      # Profile editing and avatar upload
│   │   ├── FirebaseSetupModal.tsx    # Firebase configuration & deployment guide
│   │   ├── FollowersModal.tsx        # Followers and Following lists
│   │   ├── FollowRequestsModal.tsx   # Accept / Reject follow requests
│   │   ├── Navbar.tsx                # Brand header, search, and notification pill
│   │   ├── NotificationsModal.tsx    # Activity alerts feed
│   │   ├── PrivacySettingsModal.tsx  # Private profile and privacy toggles
│   │   ├── SearchUsersModal.tsx      # User discovery by handle, name, or UID
│   │   ├── Sidebar.tsx               # Desktop sidebar & mobile navigation
│   │   ├── SocialFeed.tsx            # Moments / Posts timeline
│   │   └── UserProfileModal.tsx      # User profile card & actions
│   ├── context/
│   │   ├── AuthContext.tsx           # Authentication and user state
│   │   ├── ChatContext.tsx           # Conversations and real-time messaging
│   │   └── SocialContext.tsx         # Follows, requests, and posts
│   ├── firebase/
│   │   ├── config.ts                 # Firebase SDK initialization & test connection
│   │   ├── errorHandler.ts           # Standardized Firestore error handling
│   │   ├── firebaseService.ts        # Cloud Firestore & reactive store logic
│   │   ├── mockData.ts               # Initial sample users and seed data
│   │   └── storageService.ts         # Firebase Storage image upload service
│   ├── types.ts                      # Shared TypeScript definitions
│   ├── App.tsx                       # Main application shell
│   ├── index.css                     # Tailwind CSS v4 styles & theme
│   └── main.tsx                      # Application entry point
├── firebase-blueprint.json           # Intermediate Schema Blueprint
├── firestore.rules                   # Production Firestore security rules
├── storage.rules                     # Production Storage security rules
├── security_spec.md                  # Security specification & Dirty Dozen tests
└── README.md
```
