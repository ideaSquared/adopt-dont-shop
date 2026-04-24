import { createContext } from 'react';
import type { ChatContextValue } from './chat-context-types';

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);
