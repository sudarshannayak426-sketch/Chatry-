import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { SocialProvider } from './context/SocialContext';
import './index.css';

import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <AuthProvider>
      <ChatProvider>
        <SocialProvider>
          <App />
        </SocialProvider>
      </ChatProvider>
    </AuthProvider>
  </ToastProvider>
);
