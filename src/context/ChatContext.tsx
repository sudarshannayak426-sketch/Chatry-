import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  getOrCreateConversation,
  markConversationAsRead,
  sendChatMessage,
  subscribeToConversations,
  subscribeToMessages,
} from '../firebase/firebaseService';
import { ChatMessage, Conversation, UserProfile } from '../types';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  loadingChats: boolean;
  totalUnread: number;
  openChatWithUser: (targetUser: UserProfile) => Promise<void>;
  selectConversation: (conv: Conversation) => void;
  closeActiveChat: () => void;
  sendMessage: (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<void>;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);

  // Subscribe to user's conversations
  useEffect(() => {
    if (!currentUser || currentUser.isGuest) {
      setConversations([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const unsub = subscribeToConversations(currentUser.uid, (list) => {
      setConversations(list);
      setLoadingChats(false);

      if (activeConversation) {
        const freshActive = list.find((c) => c.id === activeConversation.id);
        if (freshActive) setActiveConversation(freshActive);
      }
    });

    return () => {
      unsub();
    };
  }, [currentUser?.uid, activeConversation?.id]);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const unsub = subscribeToMessages(activeConversation.id, (msgs) => {
      setMessages(msgs);
      if (currentUser) {
        markConversationAsRead(activeConversation.id, currentUser.uid);
      }
    });

    return () => {
      unsub();
    };
  }, [activeConversation?.id, currentUser?.uid]);

  const openChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      throw new Error('Guest users cannot start private messages. Please sign up for a free account!');
    }
    const conv = await getOrCreateConversation(currentUser, targetUser);
    setActiveConversation(conv);
    await markConversationAsRead(conv.id, currentUser.uid);
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    if (currentUser) {
      markConversationAsRead(conv.id, currentUser.uid);
    }
  };

  const closeActiveChat = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const sendMessage = async (
    text: string,
    mediaUrl?: string,
    mediaType: 'image' | 'video' = 'image'
  ) => {
    if (!activeConversation || !currentUser) return;
    const recipientId = activeConversation.participants.find((id) => id !== currentUser.uid);
    if (!recipientId) return;

    await sendChatMessage(
      activeConversation.id,
      currentUser,
      recipientId,
      text,
      mediaUrl,
      mediaType
    );
  };

  const totalUnread = conversations.reduce((acc, conv) => {
    if (!currentUser) return acc;
    return acc + (conv.unreadCounts?.[currentUser.uid] || 0);
  }, 0);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingChats,
        totalUnread,
        openChatWithUser,
        selectConversation,
        closeActiveChat,
        sendMessage,
        refreshConversations: () => {},
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
};
