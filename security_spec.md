# Chatry Security Specification & Invariants

This document outlines the security architecture, authorization boundaries, and threat testing scenarios for the Chatry application.

## Core Data Invariants

1. **Identity Isolation (Users):**
   - A user profile at `/users/{userId}` can only be created and updated by the user whose `request.auth.uid == userId`.
   - The unique `@username` and `uid` are immutable once established.
   - Attackers cannot escalate privileges or mutate other users' profiles.

2. **Conversation Confidentiality:**
   - Conversations at `/conversations/{convId}` and subcollection `/conversations/{convId}/messages/{msgId}` are strictly private.
   - Only users who are members of `participants` can read messages or add new messages.
   - Any external user attempting to read or eavesdrop receives `PERMISSION_DENIED`.

3. **Follow Request Integrity:**
   - Follow requests at `/follow_requests/{reqId}` can only be initiated by the verified sender (`senderId == request.auth.uid`).
   - Only the intended receiver (`receiverId == request.auth.uid`) can update the status (Accept / Reject).
   - Attackers cannot forge or hijack follow requests.

4. **Temporal & Volumetric Protections (Denial of Wallet):**
   - String sizes are strictly bounded: messages max 4,000 characters, posts max 2,000 characters.
   - Images uploaded to Firebase Storage are bounded (5MB for avatars, 10MB for chat media) and restricted to `image/*` MIME types.

---

## The "Dirty Dozen" Attack Payloads (Rejection Matrix)

1. **Dirty 01: Profile Hijack**
   - *Attack:* User B sends a write to `/users/{userA_id}` attempting to overwrite User A's avatar and bio.
   - *Outcome:* `PERMISSION_DENIED` via `isOwner(userId)` guard.

2. **Dirty 02: Username Tampering**
   - *Attack:* User A attempts to mutate `existing().username` during profile update.
   - *Outcome:* `PERMISSION_DENIED` via `incoming().username == existing().username` immutability check.

3. **Dirty 03: Private Message Eavesdropping**
   - *Attack:* User C sends a query to `/conversations/{conv_A_B}/messages` without being in `participants`.
   - *Outcome:* `PERMISSION_DENIED` via `request.auth.uid in get(...).data.participants`.

4. **Dirty 04: Message Spoofing**
   - *Attack:* User A sends a message with `senderId: "user_B"` inside a conversation.
   - *Outcome:* `PERMISSION_DENIED` via `incoming().senderId == request.auth.uid`.

5. **Dirty 05: Follow Request Forgery**
   - *Attack:* User C submits a follow request with `senderId: "user_A"` and `receiverId: "user_B"`.
   - *Outcome:* `PERMISSION_DENIED` via `incoming().senderId == request.auth.uid`.

6. **Dirty 06: Follow Approval Hijacking**
   - *Attack:* User A sends an update with `status: "accepted"` on a request where User B is the receiver.
   - *Outcome:* `PERMISSION_DENIED` via `existing().receiverId == request.auth.uid`.

7. **Dirty 07: Unbounded Text Payload (Denial of Wallet)**
   - *Attack:* Attacker submits a message with a 500KB string to exhaust database storage quota.
   - *Outcome:* `PERMISSION_DENIED` via `incoming().text.size() <= 4000`.

8. **Dirty 08: Post Author Tampering**
   - *Attack:* User B updates a moment post created by User A to change the content.
   - *Outcome:* `PERMISSION_DENIED` via `existing().authorId == request.auth.uid`.

9. **Dirty 09: Post Like Escalation**
   - *Attack:* User B attempts to edit author details while liking a post.
   - *Outcome:* `PERMISSION_DENIED` via `incoming().diff(existing()).affectedKeys().hasOnly(['likes', 'commentsCount'])`.

10. **Dirty 10: Notification Snooping**
    - *Attack:* User B queries `/notifications/{notifId}` where `recipientId == "user_A"`.
    - *Outcome:* `PERMISSION_DENIED` via `resource.data.recipientId == request.auth.uid`.

11. **Dirty 11: Storage Oversize Attack**
    - *Attack:* Attacker uploads a 50MB file to `/avatars/{userId}_pic.png`.
    - *Outcome:* `PERMISSION_DENIED` via `request.resource.size < 5 * 1024 * 1024`.

12. **Dirty 12: Executable File Upload**
    - *Attack:* Attacker uploads an executable `malware.exe` with MIME `application/octet-stream` to `/avatars/`.
    - *Outcome:* `PERMISSION_DENIED` via `request.resource.contentType.matches('image/.*')`.
