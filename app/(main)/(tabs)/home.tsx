import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/Authcontext';
import { ChatApi } from '@/services/api';
import type { ChatConversationWithParticipant } from '@/types';
import { ConversationItem } from '@/components/chat/ConversationItem';

const sortConversationItems = (items: ChatConversationWithParticipant[]) => {
  return [...items].sort((left, right) => {
    const leftPinned = left.participant.settings?.is_pinned ? 1 : 0;
    const rightPinned = right.participant.settings?.is_pinned ? 1 : 0;

    if (leftPinned !== rightPinned) {
      return rightPinned - leftPinned;
    }

    const leftUnread = left.participant.unread_count || 0;
    const rightUnread = right.participant.unread_count || 0;

    if (leftUnread !== rightUnread) {
      return rightUnread - leftUnread;
    }

    const leftTime = new Date(
      left.conversation.last_message?.createdAt || left.conversation.updatedAt || 0,
    ).getTime();
    const rightTime = new Date(
      right.conversation.last_message?.createdAt || right.conversation.updatedAt || 0,
    ).getTime();

    return rightTime - leftTime;
  });
};

export default function HomeScreen() {
  const router = useRouter();
  const { chatUserId, setChatUserId } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [items, setItems] = useState<ChatConversationWithParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeBucket, setActiveBucket] = useState<'priority' | 'other'>('priority');

  const resolveAutoChatUserId = useCallback(async (force = false): Promise<string | null> => {
    if (!force && chatUserId) {
      return chatUserId;
    }

    try {
      const users = await ChatApi.getAllUsers();
      const firstMongoUserId = users.find((candidate) => candidate?.user_id)?.user_id;
      if (firstMongoUserId) {
        await setChatUserId(firstMongoUserId);
        return firstMongoUserId;
      }
    } catch (error) {
      console.warn('Cannot load users from chat-service.', error);
    }
    return null;
  }, [chatUserId, setChatUserId]);

  const loadConversations = useCallback(async () => {
    let userIdForChat = chatUserId;
    if (!userIdForChat) {
      userIdForChat = await resolveAutoChatUserId();
    }

    if (!userIdForChat) {
      setItems([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const data = await ChatApi.getUserConversations(userIdForChat);
      setItems(sortConversationItems(data));
    } catch (error) {
      const status = (error as any)?.details?.status;

      if (status === 404) {
        try {
          const fallbackUserId = await resolveAutoChatUserId(true);
          if (fallbackUserId && fallbackUserId !== userIdForChat) {
            const retryData = await ChatApi.getUserConversations(fallbackUserId);
            setItems(sortConversationItems(retryData));
            return;
          }
        } catch (retryError) {
          console.error('Retry with fallback user failed:', retryError);
        }
      }

      console.error('Failed to load conversations:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [chatUserId, resolveAutoChatUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations]),
  );

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) => {
      const conversation = item.conversation;
      const title = conversation.name?.toLowerCase() || '';
      const lastMessage = conversation.last_message?.content?.toLowerCase() || '';
      const participantNames = conversation.participants
        ?.map((participant) => participant.display_name || participant.name || participant.nickname || '')
        .join(' ')
        .toLowerCase() || '';

      return [title, lastMessage, participantNames].some((value) => value.includes(keyword));
    });
  }, [items, searchText]);

  const bucketedItems = useMemo(() => {
    if (activeBucket === 'priority') {
      return filteredItems.filter(
        (item) => !!item.participant.settings?.is_pinned || (item.participant.unread_count || 0) > 0,
      );
    }

    return filteredItems.filter(
      (item) => !item.participant.settings?.is_pinned && (item.participant.unread_count || 0) === 0,
    );
  }, [activeBucket, filteredItems]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadConversations();
  }, [loadConversations]);

  return (
    <SafeAreaView className="flex-1 bg-[#f3f4f8]" edges={['top']}>
      <View className="bg-[#8b6642] px-4 pb-4 pt-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push('/(auth)/demo-users')}
            className="max-w-[65%] flex-row items-center rounded-full bg-white/18 px-3 py-2"
          >
            <View className="h-6 w-6 items-center justify-center rounded-full bg-white/25">
              <Feather name="users" size={13} color="#fff" />
            </View>
            <Text className="ml-2 flex-1 text-[12px] font-semibold text-white" numberOfLines={1}>
              {chatUserId ? `User: ${chatUserId}` : 'Chọn user chat'}
            </Text>
            <Feather name="chevron-down" size={14} color="#fff" />
          </Pressable>

          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.push('/(auth)/demo-users')}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/18"
            >
              <Feather name="maximize" size={17} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Chức năng', 'Tạo cuộc trò chuyện mới sẽ được nối sau')}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/18"
            >
              <Feather name="plus" size={19} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View className="flex-row items-center rounded-2xl bg-white/16 px-4 py-3">
          <Feather name="search" size={20} color="#f4ede6" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm kiếm"
            placeholderTextColor="#f4ede6"
            className="ml-3 flex-1 text-[16px] text-white"
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Feather name="x-circle" size={18} color="#f4ede6" />
            </Pressable>
          )}
        </View>
      </View>

      <View className="border-b border-slate-200 bg-white px-4 pb-2 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row rounded-full bg-slate-100 p-1">
            <Pressable
              onPress={() => setActiveBucket('priority')}
              className={`rounded-full px-4 py-1.5 ${activeBucket === 'priority' ? 'bg-white' : ''}`}
            >
              <Text className={`text-[17px] font-semibold ${activeBucket === 'priority' ? 'text-slate-900' : 'text-slate-500'}`}>
                Ưu tiên
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveBucket('other')}
              className={`rounded-full px-4 py-1.5 ${activeBucket === 'other' ? 'bg-white' : ''}`}
            >
              <Text className={`text-[17px] font-semibold ${activeBucket === 'other' ? 'text-slate-900' : 'text-slate-500'}`}>
                Khác
              </Text>
            </Pressable>
          </View>

          <Pressable className="h-10 w-10 items-center justify-center rounded-full">
            <Feather name="sliders" size={22} color="#7a7d86" />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 pt-2">
        <FlatList
          data={bucketedItems}
          keyExtractor={(item) => item.conversation._id}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              currentUserId={chatUserId || undefined}
              onPress={() =>
                router.push(
                  {
                    pathname: '/chat/[conversationId]',
                    params: { conversationId: item.conversation._id },
                  } as any,
                )
              }
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#8b5e34" />
          }
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <View className="flex-1 items-center justify-center px-6 py-20">
                <Text className="text-[15px] text-slate-500">Đang tải cuộc trò chuyện...</Text>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-6 py-20">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                  <Feather name="message-circle" size={28} color="#8b5e34" />
                </View>
                <Text className="text-center text-[17px] font-semibold text-slate-900">
                  {searchText.trim() ? 'Không tìm thấy hội thoại' : 'Chưa có hội thoại nào'}
                </Text>
                <Text className="mt-2 text-center text-[13px] leading-5 text-slate-500">
                  {searchText.trim()
                    ? 'Hãy thử từ khóa khác để tìm đúng cuộc trò chuyện.'
                    : activeBucket === 'priority'
                      ? 'Mục Ưu tiên đang trống. Chuyển sang mục Khác để xem thêm.'
                      : 'Khi có tin nhắn mới, danh sách sẽ xuất hiện ở đây.'}
                </Text>
              </View>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
