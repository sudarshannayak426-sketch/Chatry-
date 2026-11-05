import { Compass, Home, MessageSquare, Search, User } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export type MainTab = 'home' | 'search' | 'chats' | 'profile';

interface BottomNavProps {
  currentTab: MainTab;
  onTabSelect: (tab: MainTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabSelect }) => {
  const { totalUnread } = useChat();
  const { currentUser } = useAuth();

  const items = [
    { id: 'home' as MainTab, label: 'Home', icon: Home },
    { id: 'search' as MainTab, label: 'Search', icon: Search },
    {
      id: 'chats' as MainTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: totalUnread > 0 ? totalUnread : undefined,
    },
    { id: 'profile' as MainTab, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabSelect(item.id)}
              className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
