import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatConversationWithParticipant, ChatMessage } from '@/types/entities/chat';
import type { ChatCategory, ChatLinkMessage } from '@/services/api/chat';

export function useConversationInfo(conversationId: string | undefined, userIdForChat: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ChatConversationWithParticipant['conversation'] | null>(null);
  const [participant, setParticipant] = useState<ChatConversationWithParticipant['participant'] | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [mediaMessages, setMediaMessages] = useState<ChatMessage[]>([]);
  const [fileMessages, setFileMessages] = useState<ChatMessage[]>([]);
  const [linkMessages, setLinkMessages] = useState<ChatLinkMessage[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>([]);
  const [isDissolved, setIsDissolved] = useState(false);

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
        ChatApi.getAllUsers().catch(() => []),
        ChatApi.getMessages(conversationId, userIdForChat).catch(() => ({ messages: [] })),
      ]);

      const selected = (conversations || []).find(
        (item) => item.conversation._id === conversationId,
      );

      setConversation(selected?.conversation || null);
      setParticipant(selected?.participant || null);
      setMembers(Array.isArray(membersData) ? membersData : []);
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
