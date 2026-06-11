import { useContext } from 'react';
import { ChatContext } from './chat-context';
import type { ChatContextValue } from './chat-context-types';

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
