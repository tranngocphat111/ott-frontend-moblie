import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/Authcontext';
import { ChatApi } from '@/services/api';
import type { ChatConversationWithParticipant, ChatMessage } from '@/types';
import type { ChatCategory, ChatLinkMessage } from '@/services/api/chat.api';
import { getConversationAvatar, getConversationTitle, resolveMediaUrl } from '@/utils/chat';

type InfoTab = 'members' | 'pinned' | 'media' | 'files' | 'links';

const tabs: { key: InfoTab; label: string }[] = [
  { key: 'members', label: 'Thành viên' },
  { key: 'pinned', label: 'Ghim' },
  { key: 'media', label: 'Ảnh/Video' },
  { key: 'files', label: 'Tệp' },
  { key: 'links', label: 'Link' },
];

const getFirstContent = (message: ChatMessage) => {
  const first = Array.isArray(message.content) ? message.content[0] : '';
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') return first.url || first.text || first.name || '';
  return '';
};

export default function ChatInfoScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, chatUserId } = useAuth();

  const [tab, setTab] = useState<InfoTab>('members');
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ChatConversationWithParticipant['conversation'] | null>(null);
  const [participant, setParticipant] = useState<ChatConversationWithParticipant['participant'] | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [mediaMessages, setMediaMessages] = useState<ChatMessage[]>([]);
  const [fileMessages, setFileMessages] = useState<ChatMessage[]>([]);
  const [linkMessages, setLinkMessages] = useState<ChatLinkMessage[]>([]);

  const userIdForChat = chatUserId || user?.id;
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === 'group';

  const loadInfo = useCallback(async () => {
    if (!conversationId || !userIdForChat) return;

    setLoading(true);
    try {
      const [conversations, membersData, pinnedData, mediaData, filesData, linksData, categoriesData] = await Promise.all([
        ChatApi.getUserConversations(userIdForChat),
        ChatApi.getConversationMembers(conversationId),
        ChatApi.getPinnedMessages(conversationId).catch(() => []),
        ChatApi.getMediaMessages(conversationId).catch(() => []),
        ChatApi.getFileMessages(conversationId).catch(() => []),
        ChatApi.getLinkMessages(conversationId).catch(() => []),
        ChatApi.getUserCategories(userIdForChat).catch(() => []),
      ]);

      const selected = (conversations || []).find(
        (item) => item.conversation._id === conversationId,
      );

      setConversation(selected?.conversation || null);
      setParticipant(selected?.participant || null);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setPinnedMessages(Array.isArray(pinnedData) ? pinnedData : []);
      setMediaMessages(Array.isArray(mediaData) ? mediaData : []);
      setFileMessages(Array.isArray(filesData) ? filesData : []);
      setLinkMessages(Array.isArray(linksData) ? linksData : []);
    } catch (error) {
      console.error('Failed to load chat info:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin hội thoại');
    } finally {
      setLoading(false);
    }
  }, [conversationId, userIdForChat]);

  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

  const handleTogglePinConversation = async () => {
    if (!conversationId || !userIdForChat || !participant) return;
    try {
      await ChatApi.updatePinStatus(
        conversationId,
        userIdForChat,
        !participant.settings?.is_pinned,
      );
      await loadInfo();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái ghim hội thoại');
    }
  };

  const handleSelectCategory = async (categoryId?: string | null) => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updateConversationCategory(conversationId, userIdForChat, categoryId ?? null);
      await loadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật phân loại hội thoại');
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationId || !userIdForChat) return;
    Alert.alert('Xóa hội thoại', 'Bạn chỉ xóa ở phía bạn. Tiếp tục?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatApi.deleteConversationForMe(conversationId, userIdForChat);
            router.back();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa hội thoại');
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = async () => {
    if (!conversationId || !userIdForChat || !isGroup) return;
    Alert.alert('Rời nhóm', 'Bạn chắc chắn muốn rời nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatApi.leaveGroup(conversationId, userIdForChat);
            router.back();
          } catch {
            Alert.alert('Lỗi', 'Không thể rời nhóm');
          }
        },
      },
    ]);
  };

  const emptyMessage = useMemo(() => {
    switch (tab) {
      case 'members':
        return 'Chưa có thành viên';
      case 'pinned':
        return 'Chưa có tin ghim';
      case 'media':
        return 'Chưa có ảnh/video';
      case 'files':
        return 'Chưa có tệp';
      default:
        return 'Chưa có liên kết';
    }
  }, [tab]);

  const dataForTab = useMemo(() => {
    if (tab === 'members') return members;
    if (tab === 'pinned') return pinnedMessages;
    if (tab === 'media') return mediaMessages;
    if (tab === 'files') return fileMessages;
    return linkMessages;
  }, [tab, members, pinnedMessages, mediaMessages, fileMessages, linkMessages]);

  return (
    <SafeAreaView className="flex-1 bg-[#f3f4f8]" edges={['top']}>
      <View className="bg-white px-4 pb-3 pt-3 border-b border-slate-200">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 rounded-full bg-slate-100 items-center justify-center">
            <Feather name="chevron-left" size={20} color="#0f172a" />
          </Pressable>

          <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
            {avatar ? <Image source={{ uri: avatar }} className="h-full w-full" /> : null}
          </View>

          <View className="flex-1">
            <Text className="text-[16px] font-semibold text-slate-900" numberOfLines={1}>{title}</Text>
            <Text className="text-[12px] text-slate-500">
              {isGroup ? `${members.length} thành viên` : 'Hội thoại riêng'}
            </Text>
          </View>
        </View>
      </View>

      <View className="bg-white px-4 py-3 border-b border-slate-200">
        <View className="flex-row gap-2">
          {tabs.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              className={`rounded-full px-3 py-2 ${tab === item.key ? 'bg-[#8b6642]' : 'bg-slate-100'}`}
            >
              <Text className={`text-[12px] font-semibold ${tab === item.key ? 'text-white' : 'text-slate-600'}`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="bg-white px-4 py-3 border-b border-slate-200">
        <View className="flex-row gap-2">
          <Pressable onPress={handleTogglePinConversation} className="rounded-xl bg-slate-100 px-3 py-2">
            <Text className="text-[12px] font-semibold text-slate-700">
              {participant?.settings?.is_pinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}
            </Text>
          </Pressable>

          <Pressable onPress={handleDeleteConversation} className="rounded-xl bg-slate-100 px-3 py-2">
            <Text className="text-[12px] font-semibold text-slate-700">Xóa ở phía bạn</Text>
          </Pressable>

          {isGroup && (
            <Pressable onPress={handleLeaveGroup} className="rounded-xl bg-red-100 px-3 py-2">
              <Text className="text-[12px] font-semibold text-red-700">Rời nhóm</Text>
            </Pressable>
          )}
        </View>

        <View className="mt-3">
          <Text className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Phân loại
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => handleSelectCategory(null)}
              className={`rounded-full px-3 py-2 ${!participant?.settings?.category_id ? 'bg-[#8b6642]' : 'bg-slate-100'}`}
            >
              <Text className={`text-[12px] font-semibold ${!participant?.settings?.category_id ? 'text-white' : 'text-slate-700'}`}>
                Không phân loại
              </Text>
            </Pressable>

            {categories.map((category) => {
              const isSelected = participant?.settings?.category_id === category._id;
              return (
                <Pressable
                  key={category._id}
                  onPress={() => handleSelectCategory(category._id)}
                  className={`rounded-full px-3 py-2 ${isSelected ? 'bg-[#8b6642]' : 'bg-slate-100'}`}
                >
                  <Text className={`text-[12px] font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b6642" />
        </View>
      ) : (
        <FlatList
          data={dataForTab}
          keyExtractor={(item: any, index) => String(item?._id || item?.msg_id || item?.user_id || index)}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-[14px] text-slate-500">{emptyMessage}</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            if (tab === 'members') {
              const name = item?.nickname || item?.user?.name || item?.name || item?.user_id;
              const avatarUrl = item?.user?.avatar || item?.avatar;
              return (
                <View className="mb-2 flex-row items-center rounded-2xl bg-white px-3 py-3 border border-slate-200">
                  <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                    {avatarUrl ? <Image source={{ uri: avatarUrl }} className="h-full w-full" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">{name}</Text>
                    <Text className="text-[12px] text-slate-500">{item?.roles === 'admin' ? 'Quản trị viên' : 'Thành viên'}</Text>
                  </View>
                </View>
              );
            }

            if (tab === 'links') {
              const firstLink = Array.isArray(item?.links) ? item.links[0] : '';
              return (
                <View className="mb-2 rounded-2xl bg-white px-3 py-3 border border-slate-200">
                  <Text className="text-[12px] text-slate-500">{item?.sender_name || item?.sender_id || 'Thành viên'}</Text>
                  <Text className="mt-1 text-[13px] text-blue-600" numberOfLines={2}>{firstLink}</Text>
                </View>
              );
            }

            const message = item as ChatMessage;
            const content = getFirstContent(message);

            if (tab === 'media') {
              const resolved = resolveMediaUrl(content);
              return (
                <View className="mb-2 rounded-2xl bg-white px-2 py-2 border border-slate-200">
                  {resolved ? <Image source={{ uri: resolved }} className="h-44 w-full rounded-xl bg-slate-200" resizeMode="cover" /> : null}
                </View>
              );
            }

            return (
              <View className="mb-2 rounded-2xl bg-white px-3 py-3 border border-slate-200">
                <Text className="text-[12px] text-slate-500">{message.sender_name || message.sender_id || 'Thành viên'}</Text>
                <Text className="mt-1 text-[13px] text-slate-700" numberOfLines={2}>{content || '[Không có nội dung]'}</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
