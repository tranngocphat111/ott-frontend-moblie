import type { ChatConversationWithParticipant } from "@/types/entities/chat";

export type ConversationInfoSnapshot = {
  conversation: ChatConversationWithParticipant["conversation"] | null;
  participant: ChatConversationWithParticipant["participant"] | null;
  members?: any[];
  updatedAt: number;
};

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const snapshots = new Map<string, ConversationInfoSnapshot>();

const normalizeConversationId = (conversationId?: string | null) =>
  String(conversationId || "").trim();

export const setConversationInfoSnapshot = (
  conversationId: string | undefined | null,
  snapshot: Partial<Omit<ConversationInfoSnapshot, "updatedAt">>,
) => {
  const targetId = normalizeConversationId(
    conversationId || snapshot.conversation?._id,
  );
  if (!targetId) return;

  const previous = snapshots.get(targetId);
  snapshots.set(targetId, {
    conversation: snapshot.conversation ?? previous?.conversation ?? null,
    participant: snapshot.participant ?? previous?.participant ?? null,
    members: snapshot.members ?? previous?.members,
    updatedAt: Date.now(),
  });
};

export const getConversationInfoSnapshot = (
  conversationId: string | undefined | null,
) => {
  const targetId = normalizeConversationId(conversationId);
  if (!targetId) return null;

  const snapshot = snapshots.get(targetId);
  if (!snapshot) return null;

  if (Date.now() - snapshot.updatedAt > SNAPSHOT_TTL_MS) {
    snapshots.delete(targetId);
    return null;
  }

  return snapshot;
};
