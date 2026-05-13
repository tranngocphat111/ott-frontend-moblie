import React, { createContext, useContext, useMemo, useState } from 'react';

export type ConversationContextAnchor = {
  conversationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  relationship?: any;
};

type ConversationContextMenuValue = {
  activeAnchor: ConversationContextAnchor | null;
  openMenu: (payload: ConversationContextAnchor) => void;
  closeMenu: () => void;
};

const ConversationContextMenu = createContext<ConversationContextMenuValue | null>(null);

export function ConversationContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [activeAnchor, setActiveAnchor] = useState<ConversationContextAnchor | null>(null);

  const value = useMemo<ConversationContextMenuValue>(
    () => ({
      activeAnchor,
      openMenu: (payload) => setActiveAnchor(payload),
      closeMenu: () => setActiveAnchor(null),
    }),
    [activeAnchor],
  );

  return <ConversationContextMenu.Provider value={value}>{children}</ConversationContextMenu.Provider>;
}

export function useConversationContextMenu() {
  const context = useContext(ConversationContextMenu);
  if (!context) {
    throw new Error('useConversationContextMenu must be used within ConversationContextMenuProvider');
  }
  return context;
}
