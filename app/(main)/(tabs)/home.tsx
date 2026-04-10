import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/Authcontext';
import { ChatApi, chatSocket } from '@/services/api';
import { THEME_COLORS } from '@/constants/theme';
import type { ChatConversationWithParticipant } from '@/types/entities/chat';
import type {
  ChatCategory,
  ChatSearchContactItem,
  ChatSearchFileItem,
  ChatSearchMessageItem,
  ChatSearchResult,
  ChatServiceUser,
} from '@/services/api/chat';
import { ConversationItem } from '@/components/chat/ConversationItem';
import {
  ConversationFilterModal,
  type ConversationFilterMode,
} from '@/components/chat/modals/ConversationFilterModal';
import { CategorySelectionModal } from '@/components/chat/modals/CategorySelectionModal';
import { CategoryManagementModal } from '@/components/chat/modals/CategoryManagementModal';
import { UserPickerModal } from '@/components/chat/modals/UserPickerModal';

type SearchTab = 'all' | 'contacts' | 'messages' | 'files';
const SEARCH_HISTORY_KEY = 'ott-chat-search-history';

const EMPTY_SEARCH: ChatSearchResult = {
  contacts: [],
  conversations: [],
  messages: [],
  files: [],
  media: [],
  total: 0,
};

const sortConversationItems = (items: ChatConversationWithParticipant[]) => {
  return [...items].sort((left, right) => {
    const leftPinned = left.participant.settings?.is_pinned ? 1 : 0;
    const rightPinned = right.participant.settings?.is_pinned ? 1 : 0;

    if (leftPinned !== rightPinned) {
      return rightPinned - leftPinned;
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

const normalizeSearchResult = (payload: any): ChatSearchResult => {
  const contacts = Array.isArray(payload?.contacts)
    ? payload.contacts
    : Array.isArray(payload?.users)
      ? payload.users.map((user: any) => ({
          user_id: String(user.user_id || user._id || ''),
          name: String(user.name || user.user_id || ''),
          avatar: user.avatar,
          phone: user.phone,
          conversation_ids: [],
        }))
      : [];

  const result: ChatSearchResult = {
    contacts,
    conversations: Array.isArray(payload?.conversations) ? payload.conversations : [],
    messages: Array.isArray(payload?.messages) ? payload.messages : [],
    files: Array.isArray(payload?.files) ? payload.files : [],
    media: Array.isArray(payload?.media) ? payload.media : [],
    total: Number(payload?.total || 0),
  };

  if (!result.total) {
    result.total =
      result.contacts.length +
      result.conversations.length +
      result.messages.length +
      result.files.length +
      result.media.length;
  }

  return result;
};

const previewMessage = (item: ChatSearchMessageItem) => {
  return String(item.preview || '').trim() || '[Tin nhắn]';
};

const previewFile = (item: ChatSearchFileItem) => {
  return String(item.file_name || item.key || '').trim() || '[Tệp]';
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chatUserId, setChatUserId } = useAuth();

  const [searchText, setSearchText] = useState('');
  const [items, setItems] = useState<ChatConversationWithParticipant[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatServiceUser[]>([]);
  const [categories, setCategories] = useState<ChatCategory[]>([]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryManagementVisible, setCategoryManagementVisible] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filterMode, setFilterMode] = useState<ConversationFilterMode>('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [searchTab, setSearchTab] = useState<SearchTab>('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ChatSearchResult | null>(null);
  const [senderFilter, setSenderFilter] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);

  const selectedUser = useMemo(
    () => chatUsers.find((candidate) => candidate.user_id === chatUserId) || null,
    [chatUsers, chatUserId],
  );

  const loadChatUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await ChatApi.getAllUsers();
      const users = Array.isArray(response) ? response : [];
      setChatUsers(users);

      const isStoredUserValid = !!chatUserId && users.some((candidate) => candidate.user_id === chatUserId);
      if (!isStoredUserValid && users.length > 0) {
        await setChatUserId(users[0].user_id);
      }

      return users;
    } catch (error) {
      console.warn('Cannot load users from chat-service.', error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, [chatUserId, setChatUserId]);

  useEffect(() => {
    void loadChatUsers();
  }, [loadChatUsers]);

  useEffect(() => {
    void (async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (!storedHistory) return;

        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          setRecentSearches(parsedHistory.filter((item) => typeof item === 'string').slice(0, 8));
        }
      } catch (error) {
        console.warn('Cannot load search history.', error);
      }
    })();
  }, []);

  const rememberSearchQuery = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    setRecentSearches((current) => {
      const next = [normalizedQuery, ...current.filter((item) => item !== normalizedQuery)].slice(0, 8);
      void AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resolveAutoChatUserId = useCallback(async (force = false): Promise<string | null> => {
    if (!force && chatUserId) {
      return chatUserId;
    }

    try {
      const users = chatUsers.length > 0 ? chatUsers : await loadChatUsers();
      const firstMongoUserId = users.find((candidate) => candidate?.user_id)?.user_id;
      if (firstMongoUserId) {
        await setChatUserId(firstMongoUserId);
        return firstMongoUserId;
      }
    } catch (error) {
      console.warn('Cannot load users from chat-service.', error);
    }

    return null;
  }, [chatUserId, chatUsers, loadChatUsers, setChatUserId]);

  const loadConversations = useCallback(async () => {
    const users = chatUsers.length > 0 ? chatUsers : await loadChatUsers();
    const storedUserIsValid = !!chatUserId && users.some((candidate) => candidate.user_id === chatUserId);

    let userIdForChat = storedUserIsValid ? chatUserId : users[0]?.user_id || null;
    if (!userIdForChat) {
      userIdForChat = await resolveAutoChatUserId();
    }

    if (!userIdForChat) {
      setItems([]);
      setCategories([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const [conversationData, categoryData] = await Promise.all([
        ChatApi.getUserConversations(userIdForChat),
        ChatApi.getUserCategories(userIdForChat).catch(() => [] as ChatCategory[]),
      ]);

      setItems(sortConversationItems(conversationData));
      setCategories(Array.isArray(categoryData) ? categoryData : []);
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
  }, [chatUserId, chatUsers, loadChatUsers, resolveAutoChatUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    if (!chatUserId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(chatUserId);

    const refreshInbox = () => {
      setIsRefreshing(true);
      void loadConversations();
    };

    chatSocket.on('tin_nhan', refreshInbox);
    chatSocket.on('tao_phong_moi', refreshInbox);
    chatSocket.on('cap_nhat_nhom', refreshInbox);
    chatSocket.on('roi_nhom', refreshInbox);
    chatSocket.on('xoa_thanh_vien', refreshInbox);
    chatSocket.on('bi_xoa_khoi_nhom', refreshInbox);
    chatSocket.on('giai_tan_nhom', refreshInbox);

    return () => {
      chatSocket.off('tin_nhan', refreshInbox);
      chatSocket.off('tao_phong_moi', refreshInbox);
      chatSocket.off('cap_nhat_nhom', refreshInbox);
      chatSocket.off('roi_nhom', refreshInbox);
      chatSocket.off('xoa_thanh_vien', refreshInbox);
      chatSocket.off('bi_xoa_khoi_nhom', refreshInbox);
      chatSocket.off('giai_tan_nhom', refreshInbox);
    };
  }, [chatUserId, loadConversations]);

  useEffect(() => {
    const keyword = searchText.trim();
    if (!keyword || !chatUserId) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchTab('all');
      setSenderFilter('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const payload = await ChatApi.searchEverything(chatUserId, keyword, {
          limit: 24,
          senderId: senderFilter || undefined,
        });
        setSearchResults(normalizeSearchResult(payload));
        void rememberSearchQuery(keyword);
      } catch (error) {
        console.error('Search failed', error);
        setSearchResults(EMPTY_SEARCH);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText, chatUserId, senderFilter, rememberSearchQuery]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadConversations();
  }, [loadConversations]);

  const handleOpenUserPicker = useCallback(async () => {
    if (chatUsers.length === 0) {
      await loadChatUsers();
    }
    setPickerVisible(true);
  }, [chatUsers.length, loadChatUsers]);

  const handleSelectChatUser = useCallback(
    async (userId: string) => {
      await setChatUserId(userId);
      setPickerVisible(false);
      setIsRefreshing(true);
      void loadConversations();
    },
    [loadConversations, setChatUserId],
  );

  const handleToggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }, []);

  const handleChangeFilterMode = useCallback((mode: ConversationFilterMode) => {
    setFilterMode(mode);
    if (mode === 'all' || mode === 'unread') {
      setSelectedCategoryIds([]);
      setDraftCategoryIds([]);
    }
  }, []);

  const handleOpenCategoryPicker = useCallback(() => {
    setDraftCategoryIds(selectedCategoryIds);
    setCategoryPickerVisible(true);
  }, [selectedCategoryIds]);

  const handleApplyCategoryFilter = useCallback(() => {
    setSelectedCategoryIds(draftCategoryIds);
    setFilterMode(draftCategoryIds.length > 0 ? 'category' : 'all');
    setCategoryPickerVisible(false);
  }, [draftCategoryIds]);

  const handleClearDraftCategories = useCallback(() => {
    setDraftCategoryIds([]);
  }, []);

  const filteredItems = useMemo(() => {
    let next = [...items];

    next = next.filter((item) => {
      const deletedMsgId = item.participant.deleted_msg_id || '0';
      const lastMsgId = item.conversation.last_message?.msg_id;
      if (deletedMsgId === '0') return true;
      if (lastMsgId) return BigInt(lastMsgId) > BigInt(deletedMsgId);
      return false;
    });

    if (filterMode === 'unread') {
      next = next.filter((item) => Number(item.participant.unread_count || 0) > 0);
    }

    if (filterMode === 'category' && selectedCategoryIds.length > 0) {
      next = next.filter((item) => {
        const categoryId = item.participant.settings?.category_id;
        return !!categoryId && selectedCategoryIds.includes(String(categoryId));
      });
    }

    return sortConversationItems(next);
  }, [items, filterMode, selectedCategoryIds]);

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category._id, category]));
  }, [categories]);

  const isUnreadFilterActive = filterMode === 'unread';
  const isCategoryFilterActive = filterMode === 'category' && selectedCategoryIds.length > 0;
  const isFilterActive = isUnreadFilterActive || isCategoryFilterActive;

  const firstSelectedCategory = useMemo(() => {
    if (!isCategoryFilterActive) return null;
    return categoryById.get(selectedCategoryIds[0]) || null;
  }, [categoryById, isCategoryFilterActive, selectedCategoryIds]);

  const senderOptions = useMemo(() => {
    const messages = searchResults?.messages || [];
    const map = new Map<string, string>();

    messages.forEach((item) => {
      const id = String(item.sender_id || '');
      const name = String(item.sender_name || item.sender_id || '');
      if (id && !map.has(id)) {
        map.set(id, name);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [searchResults]);

  const filteredSearchMessages = useMemo(() => {
    const messages = searchResults?.messages || [];
    if (!senderFilter) return messages;
    return messages.filter((item) => String(item.sender_id || '') === senderFilter);
  }, [searchResults, senderFilter]);

  const hasSearchQuery = searchText.trim().length > 0;
  const isSearching = isSearchFocused || hasSearchQuery;

  const getInitials = useCallback((label: string) => {
    const parts = String(label || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return '?';
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, []);

  const renderAvatar = useCallback(
    (options: { label: string; avatar?: string | null; icon: React.ComponentProps<typeof Feather>['name'] }) => {
      const initials = getInitials(options.label);

      return (
        <View className="h-11 w-11 overflow-hidden rounded-2xl bg-primary-600/12 items-center justify-center">
          {options.avatar ? (
            <Image source={{ uri: options.avatar }} className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-primary-600/12">
              <Feather name={options.icon} size={16} color={THEME_COLORS.primary[600]} />
              <Text className="mt-0.5 text-[11px] font-bold text-primary-600">{initials}</Text>
            </View>
          )}
        </View>
      );
    },
    [getInitials],
  );

  const openConversation = useCallback(
    (conversationId: string) => {
      if (!conversationId) return;
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } } as any);
    },
    [router],
  );

  const renderSearchSectionHeader = (label: string, count: number) => (
    <Text className="mb-2 text-[13px] font-semibold text-slate-700">{`${label} (${count})`}</Text>
  );

  const renderSearchHistory = () => {
    if (recentSearches.length === 0) {
      return (
        <View className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <Text className="text-[15px] font-semibold text-slate-900">Lịch sử tìm kiếm</Text>
          <Text className="mt-1 text-[13px] text-slate-500">
            Bắt đầu nhập để tìm đoạn chat, người gửi, file hoặc media.
          </Text>
        </View>
      );
    }

    return (
      <View className="rounded-2xl bg-white px-4 py-4 shadow-sm">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[15px] font-semibold text-slate-900">Lịch sử tìm kiếm</Text>
          <Feather name="clock" size={15} color={THEME_COLORS.neutral.slate500} />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {recentSearches.map((item) => (
            <Pressable
              key={item}
              onPress={() => setSearchText(item)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <Text className="text-[13px] font-medium text-slate-700">{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderSearchPanel = () => {
    if (searchLoading) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-20">
          <Text className="text-[14px] text-slate-500">Đang tìm kiếm...</Text>
        </View>
      );
    }

    if (searchText.trim().length === 0) {
      return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
          {renderSearchHistory()}
        </ScrollView>
      );
    }

    if (!searchResults || searchResults.total === 0) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-20">
          <Text className="text-[14px] text-slate-500">Không tìm thấy kết quả phù hợp</Text>
        </View>
      );
    }

    const keyword = searchText.trim().toLowerCase();
    const conversationByName = (searchResults.conversations || []).filter((item) =>
      String(item.name || '').toLowerCase().includes(keyword),
    );

    return (
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        {(searchTab === 'all' || searchTab === 'contacts') && searchResults.contacts.length > 0 && (
          <View className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
            {renderSearchSectionHeader('Liên hệ', searchResults.contacts.length)}
            {searchResults.contacts.slice(0, searchTab === 'all' ? 4 : 24).map((item: ChatSearchContactItem, idx) => (
              <Pressable
                key={`${item.user_id}_${idx}`}
                onPress={() => openConversation(String(item.conversation_ids?.[0] || ''))}
                className="mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                {renderAvatar({ label: item.name || item.user_id, avatar: item.avatar, icon: 'user' })}
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900">{item.name || item.user_id}</Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500">{item.phone || item.user_id}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={THEME_COLORS.neutral.slate400} />
              </Pressable>
            ))}
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'contacts') && conversationByName.length > 0 && (
          <View className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
            {renderSearchSectionHeader('Đoạn chat', conversationByName.length)}
            {conversationByName.slice(0, searchTab === 'all' ? 4 : 24).map((item, idx) => (
              <Pressable
                key={`${item.conversation_id}_${idx}`}
                onPress={() => openConversation(String(item.conversation_id || ''))}
                className="mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                {renderAvatar({ label: item.name || 'Đoạn chat', avatar: item.avatar, icon: item.type === 'group' ? 'users' : 'message-circle' })}
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900">{item.name || 'Đoạn chat'}</Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500">{item.type === 'group' ? 'Nhóm' : 'Riêng tư'}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={THEME_COLORS.neutral.slate400} />
              </Pressable>
            ))}
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'messages') && filteredSearchMessages.length > 0 && (
          <View className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
            {renderSearchSectionHeader('Tin nhắn', filteredSearchMessages.length)}
            {filteredSearchMessages.slice(0, searchTab === 'all' ? 5 : 30).map((item) => (
              <Pressable
                key={item._id}
                onPress={() => openConversation(String(item.conversation_id || ''))}
                className="mb-2 flex-row items-start rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                {renderAvatar({ label: item.sender_name || item.sender_id || 'Tin nhắn', icon: 'message-circle' })}
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[14px] font-semibold text-slate-900">{item.sender_name || item.sender_id}</Text>
                    <Text className="text-[11px] text-slate-400">Tin nhắn</Text>
                  </View>
                  <Text className="mt-1 text-[14px] leading-5 text-slate-700" numberOfLines={2}>
                    {previewMessage(item)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'files') && (searchResults.files.length > 0 || searchResults.media.length > 0) && (
          <View className="rounded-2xl bg-white p-3 shadow-sm">
            {renderSearchSectionHeader('Tệp và media', searchResults.files.length + searchResults.media.length)}
            {searchResults.files.slice(0, searchTab === 'all' ? 5 : 24).map((item: ChatSearchFileItem) => (
              <Pressable
                key={item._id}
                onPress={() => openConversation(String(item.conversation_id || ''))}
                className="mb-2 flex-row items-start rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                {renderAvatar({ label: item.sender_name || item.sender_id || 'File', icon: 'paperclip' })}
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[14px] font-semibold text-slate-900">{item.sender_name || item.sender_id}</Text>
                    <Text className="text-[11px] text-slate-400">File</Text>
                  </View>
                  <Text className="mt-1 text-[14px] leading-5 text-slate-700" numberOfLines={1}>
                    {previewFile(item)}
                  </Text>
                </View>
              </Pressable>
            ))}

            {searchResults.media.slice(0, searchTab === 'all' ? 4 : 24).map((item: any, idx: number) => (
              <Pressable
                key={`${item._id || item.message_id || idx}`}
                onPress={() => openConversation(String(item.conversation_id || ''))}
                className="mb-2 flex-row items-start rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                {renderAvatar({ label: item.sender_name || item.sender_id || 'Media', icon: 'image' })}
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[14px] font-semibold text-slate-900">{item.sender_name || item.sender_id}</Text>
                    <Text className="text-[11px] text-slate-400">Media</Text>
                  </View>
                  <Text className="mt-1 text-[14px] leading-5 text-slate-700">
                    [{String(item.media_type || 'media').toUpperCase()}]
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['left', 'right']}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-4 pb-4"
        style={{ paddingTop: insets.top + 10 }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={handleOpenUserPicker}
            className="max-w-[65%] flex-row items-center rounded-full bg-white/18 px-3 py-2"
          >
            <View className="h-6 w-6 items-center justify-center rounded-full bg-white/25">
              <Feather name="users" size={13} color={THEME_COLORS.neutral.white} />
            </View>
            <Text className="ml-2 flex-1 text-[12px] font-semibold text-white" numberOfLines={1}>
              {selectedUser ? `User: ${selectedUser.name || selectedUser.user_id}` : 'Chọn user chat'}
            </Text>
            <Feather name="chevron-down" size={14} color={THEME_COLORS.neutral.white} />
          </Pressable>

          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={handleOpenUserPicker}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/18"
            >
              <Feather name="grid" size={17} color={THEME_COLORS.neutral.white} />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Chức năng', 'Tạo cuộc trò chuyện mới sẽ được nối sau')}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/18"
            >
              <Feather name="plus" size={19} color={THEME_COLORS.neutral.white} />
            </Pressable>
          </View>
        </View>

        <View className={`flex-row items-center rounded-2xl px-4 py-3 ${isSearchFocused ? 'bg-white shadow-sm' : 'bg-white/15'}`}>
          <Feather name="search" size={20} color={isSearchFocused ? THEME_COLORS.neutral.slate500 : THEME_COLORS.neutral.white} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm kiếm đoạn chat, người gửi, nội dung, tệp..."
            placeholderTextColor={isSearchFocused ? THEME_COLORS.neutral.slate400 : THEME_COLORS.neutral.white}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={`ml-3 flex-1 text-[16px] ${isSearchFocused ? 'text-slate-900' : 'text-white'}`}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Feather name="x-circle" size={18} color={isSearchFocused ? THEME_COLORS.neutral.slate400 : THEME_COLORS.neutral.white} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <UserPickerModal
        visible={pickerVisible}
        users={chatUsers}
        selectedUserId={chatUserId}
        loading={loadingUsers}
        onClose={() => setPickerVisible(false)}
        onSelectUser={(userId) => void handleSelectChatUser(userId)}
      />

      <ConversationFilterModal
        visible={filterVisible}
        onChangeFilterMode={handleChangeFilterMode}
        onOpenCategoryPicker={handleOpenCategoryPicker}
        onClose={() => setFilterVisible(false)}
      />

      <CategorySelectionModal
        visible={categoryPickerVisible}
        categories={categories}
        selectedCategoryIds={draftCategoryIds}
        onToggleCategory={handleToggleCategory}
        onApply={handleApplyCategoryFilter}
        onClear={handleClearDraftCategories}
        onManageCategories={() => {
          setCategoryPickerVisible(false);
          setCategoryManagementVisible(true);
        }}
        onClose={() => setCategoryPickerVisible(false)}
      />

      <CategoryManagementModal
        visible={categoryManagementVisible}
        userId={chatUserId}
        categories={categories}
        onClose={() => setCategoryManagementVisible(false)}
        onReload={() => void loadConversations()}
      />

      <View className="border-b border-slate-200 bg-white px-4 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-slate-900">
            {isSearching ? 'Kết quả tìm kiếm' : 'Tất cả hội thoại'}
          </Text>
          <View className="flex-row items-center gap-2">
            {isUnreadFilterActive && (
              <Pressable
                onPress={() => setFilterMode('all')}
                className="flex-row items-center rounded-full border border-slate-200 bg-white px-3 py-1.5"
              >
                <Text className="mr-1 text-[12px] font-semibold text-slate-700">Chưa đọc</Text>
                <Feather name="x" size={13} color={THEME_COLORS.neutral.slate500} />
              </Pressable>
            )}

            {isCategoryFilterActive && (
              <Pressable
                onPress={() => {
                  setSelectedCategoryIds([]);
                  setDraftCategoryIds([]);
                  setFilterMode('all');
                }}
                className="flex-row items-center rounded-full border border-slate-200 bg-white px-3 py-1.5"
              >
                <View
                  className="mr-2 h-3 w-3 rounded-sm"
                  style={{ backgroundColor: firstSelectedCategory?.color || THEME_COLORS.success.border }}
                />
                <Text className="mr-1 text-[12px] font-semibold text-slate-700">
                  {selectedCategoryIds.length} thẻ
                </Text>
                <Feather name="x" size={13} color={THEME_COLORS.neutral.slate500} />
              </Pressable>
            )}

            {!isFilterActive && (
              <Pressable onPress={() => setFilterVisible(true)} className="h-10 w-10 items-center justify-center">
                <Feather name="filter" size={22} color={THEME_COLORS.neutral.slate500} />
              </Pressable>
            )}
          </View>
        </View>

        {hasSearchQuery && (
          <View className="mt-2">
            <View className="flex-row flex-wrap gap-2">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'contacts', label: 'Liên hệ' },
                { key: 'messages', label: 'Tin nhắn' },
                { key: 'files', label: 'File' },
              ].map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setSearchTab(tab.key as SearchTab)}
                  className={`rounded-full px-3 py-1.5 ${searchTab === tab.key ? 'bg-primary-600' : 'bg-slate-100'}`}
                >
                  <Text className={`text-[12px] font-semibold ${searchTab === tab.key ? 'text-white' : 'text-slate-600'}`}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {searchTab === 'messages' && senderOptions.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setSenderFilter('')}
                    className={`rounded-full px-3 py-1.5 ${senderFilter === '' ? 'bg-primary-600/15' : 'bg-slate-100'}`}
                  >
                    <Text className="text-[12px] text-slate-700">Tất cả người gửi</Text>
                  </Pressable>
                  {senderOptions.map((sender) => (
                    <Pressable
                      key={sender.id}
                      onPress={() => setSenderFilter(sender.id)}
                      className={`rounded-full px-3 py-1.5 ${senderFilter === sender.id ? 'bg-primary-600/15' : 'bg-slate-100'}`}
                    >
                      <Text className="text-[12px] text-slate-700">{sender.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <View className="flex-1 pt-2">
        {isSearching ? (
          renderSearchPanel()
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.conversation._id}
            renderItem={({ item }) => (
              <ConversationItem
                item={item}
                currentUserId={chatUserId || undefined}
                category={item.participant.settings?.category_id ? categoryById.get(String(item.participant.settings.category_id)) || null : null}
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
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={THEME_COLORS.primary[600]} />
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
                    <Feather name="message-circle" size={28} color={THEME_COLORS.primary[600]} />
                  </View>
                  <Text className="text-center text-[17px] font-semibold text-slate-900">
                    Chưa có hội thoại nào
                  </Text>
                  <Text className="mt-2 text-center text-[13px] leading-5 text-slate-500">
                    Khi có tin nhắn mới, danh sách sẽ xuất hiện ở đây.
                  </Text>
                </View>
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

