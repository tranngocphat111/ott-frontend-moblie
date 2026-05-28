import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatConversationWithParticipant, ChatMessage } from '@/types/entities/chat';
import type { ChatCategory, ChatLinkMessage } from '@/services/api/chat';
import {
  getConversationInfoSnapshot,
  setConversationInfoSnapshot,
  type ConversationInfoSnapshot,
} from '@/utils/conversationInfoCache';

const getSnapshotMembers = (snapshot: ConversationInfoSnapshot | null) => {
  if (Array.isArray(snapshot?.members)) return snapshot.members;
  if (Array.isArray(snapshot?.conversation?.participants)) {
    return snapshot.conversation.participants;
  }
  return [];
};

export function useConversationInfo(conversationId: string | undefined, userIdForChat: string | undefined) {
  const initialSnapshotRef = useRef(getConversationInfoSnapshot(conversationId));
  const [loading, setLoading] = useState(() => !initialSnapshotRef.current?.conversation);
  const [conversation, setConversation] = useState<ChatConversationWithParticipant['conversation'] | null>(
    () => initialSnapshotRef.current?.conversation ?? null,
  );
  const [participant, setParticipant] = useState<ChatConversationWithParticipant['participant'] | null>(
    () => initialSnapshotRef.current?.participant ?? null,
  );
  const [members, setMembers] = useState<any[]>(() => getSnapshotMembers(initialSnapshotRef.current));
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [mediaMessages, setMediaMessages] = useState<ChatMessage[]>([]);
  const [fileMessages, setFileMessages] = useState<ChatMessage[]>([]);
  const [linkMessages, setLinkMessages] = useState<ChatLinkMessage[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);
  const [isDissolved, setIsDissolved] = useState(false);

  useEffect(() => {
    const snapshot = getConversationInfoSnapshot(conversationId);
    if (!snapshot) {
      setConversation(null);
      setParticipant(null);
      setMembers([]);
      setLoading(true);
      return;
    }

    setConversation(snapshot.conversation ?? null);
    setParticipant(snapshot.participant ?? null);

    const snapshotMembers = getSnapshotMembers(snapshot);
    if (snapshotMembers.length > 0) {
      setMembers(snapshotMembers);
    }

    if (snapshot.conversation) {
      setLoading(false);
    }
  }, [conversationId]);

  const loadInfo = useCallback(async () => {
    if (!conversationId || !userIdForChat) return;

    setLoading(true);
    try {
      const [conversations, membersData, pinnedData, mediaData, filesData, linksData, categoriesData, usersData, messagePayload] = await Promise.all([
        ChatApi.getUserConversations(userIdForChat),
        ChatApi.getConversationMembers(conversationId),
        ChatApi.getPinnedMessages(conversationId).catch(() => []),
        ChatApi.getMediaMessages(conversationId).catch(() => []),
        ChatApi.getFileMessages(conversationId).catch(() => []),
        ChatApi.getLinkMessages(conversationId).catch(() => []),
        ChatApi.getUserCategories(userIdForChat).catch(() => []),
        ChatApi.getFriends(userIdForChat).catch(() => []),
        ChatApi.getMessages(conversationId, userIdForChat).catch(() => ({ messages: [] })),
      ]);

      const selected = (conversations || []).find(
        (item) => item.conversation._id === conversationId,
      );
      const cachedSnapshot = getConversationInfoSnapshot(conversationId);
      const nextConversation = selected?.conversation || cachedSnapshot?.conversation || null;
      const nextParticipant = selected?.participant || cachedSnapshot?.participant || null;
      const nextMembers = Array.isArray(membersData)
        ? membersData
        : getSnapshotMembers(cachedSnapshot);

      setConversation(nextConversation);
      setParticipant(nextParticipant);
      setMembers(nextMembers);
      setAllUsers(Array.isArray(usersData) ? usersData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setPinnedMessages(Array.isArray(pinnedData) ? pinnedData : []);
      setMediaMessages(Array.isArray(mediaData) ? mediaData : []);
      setFileMessages(Array.isArray(filesData) ? filesData : []);
      setLinkMessages(Array.isArray(linksData) ? linksData : []);

      const allMessages = Array.isArray((messagePayload as any)?.messages)
        ? ((messagePayload as any).messages as ChatMessage[])
        : [];
      setVoiceMessages(allMessages.filter((message) => String(message?.type || '').toLowerCase() === 'audio'));

      const dissolveMsg = allMessages.find(m => 
        String(m.system_meta?.action || '').toLowerCase() === 'group_dissolved'
      );
      setIsDissolved(!!dissolveMsg);

      setConversationInfoSnapshot(conversationId, {
        conversation: nextConversation,
        participant: nextParticipant,
        members: nextMembers,
      });
    } catch (error) {
      console.error('Failed to load chat info:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin hội thoại');
    } finally {
      setLoading(false);
    }
  }, [conversationId, userIdForChat]);

  return {
    loading,
    conversation,
    participant,
    members,
    allUsers,
    categories,
    pinnedMessages,
    mediaMessages,
    fileMessages,
    linkMessages,
    voiceMessages,
    isDissolved,
    loadInfo,
    setCategories,
    setPinnedMessages,
    setMediaMessages,
    setFileMessages,
    setLinkMessages,
    setVoiceMessages,
    setMembers,
  };
}
