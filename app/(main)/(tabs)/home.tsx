import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/Authcontext';
import { ChatApi, chatSocket } from '@/services/api';
import { THEME_COLORS } from '@/constants/theme';
import { getConversationAvatar } from '@/utils/chat';
import type { ChatConversationWithParticipant } from '@/types/entities/chat';
import type {
  ChatCategory,
  ChatSearchContactItem,
  ChatSearchResult,
  ChatServiceUser,
} from '@/services/api/chat';
import {
  ConversationFilterModal,
  type ConversationFilterMode,
} from '@/components/chat/modals/ConversationFilterModal';
import { CategorySelectionModal } from '@/components/chat/modals/CategorySelectionModal';
import { CategoryManagementModal } from '@/components/chat/modals/CategoryManagementModal';
import { CreateGroupModal } from '@/components/chat/modals/CreateGroupModal';
import { HomeTopSection } from '@/components/home/HomeTopSection';
import { HomeSearchPanel } from '@/components/home/HomeSearchPanel';
import { HomeConversationList } from '@/components/home/HomeConversationList';
import { AddFriendModal } from '@/components/chat/modals/AddFriendModal';

type SearchTab = 'all' | 'contacts' | 'conversations' | 'messages' | 'files';
const SEARCH_CONTACT_HISTORY_KEY = 'ott-chat-search-contact-history';
const SEARCH_LOAD_MORE_STEP = 5;

const INITIAL_SEARCH_VISIBLE_COUNTS = {
  conversations: 5,
  messages: 5,
  files: 5,
  media: 5,
};

type SearchHistoryContact = {
  user_id: string;
  conversation_id?: string;
  name: string;
  avatar?: string;
};

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

export default function HomeScreen() {
  const router = useRouter();
  const { chatUserId } = useAuth();

  const [searchText, setSearchText] = useState('');
  const [items, setItems] = useState<ChatConversationWithParticipant[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatServiceUser[]>([]);
  const [categories, setCategories] = useState<ChatCategory[]>([]);

  const [filterVisible, setFilterVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryManagementVisible, setCategoryManagementVisible] = useState(false);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [addFriendVisible, setAddFriendVisible] = useState(false);

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
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchVisibleCounts, setSearchVisibleCounts] = useState(INITIAL_SEARCH_VISIBLE_COUNTS);
  const [recentContactHistory, setRecentContactHistory] = useState<SearchHistoryContact[]>([]);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [actionConversationId, setActionConversationId] = useState<string | null>(null);
  const [categoryTargetConversation, setCategoryTargetConversation] = useState<ChatConversationWithParticipant | null>(null);
  const [conversationCategoryPickerVisible, setConversationCategoryPickerVisible] = useState(false);

  const loadUsersPromiseRef = useRef<Promise<ChatServiceUser[]> | null>(null);
  const loadConversationsPromiseRef = useRef<Promise<void> | null>(null);
  const lastConversationsLoadAtRef = useRef(0);
  const loadConversationsRef = useRef<(options?: { force?: boolean }) => Promise<void>>(async () => undefined);
  const suppressSocketRefreshUntilRef = useRef(0);



  useEffect(() => {
    void (async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(SEARCH_CONTACT_HISTORY_KEY);
        if (!storedHistory) return;

        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          const normalized = parsedHistory
            .filter((item) => item && typeof item === 'object' && typeof item.user_id === 'string')
            .map((item) => ({
              user_id: String(item.user_id),
              conversation_id: item.conversation_id ? String(item.conversation_id) : undefined,
              name: String(item.name || item.user_id),
              avatar: item.avatar ? String(item.avatar) : undefined,
            }))
            .slice(0, 12);
          setRecentContactHistory(normalized);
        }
      } catch (error) {
        console.warn('Cannot load search history.', error);
      }
    })();
  }, []);

  const rememberSearchContacts = useCallback(async (contacts: ChatSearchContactItem[]) => {
    if (!Array.isArray(contacts) || contacts.length === 0) return;

    const normalizedContacts: SearchHistoryContact[] = contacts
      .filter((contact) => !!contact?.user_id)
      .slice(0, 4)
      .map((contact) => ({
        conversation_id: contact.conversation_ids?.[0] ? String(contact.conversation_ids[0]) : undefined,
        user_id: String(contact.user_id),
        name: String(contact.name || contact.user_id),
        avatar: contact.avatar,
      }));

    setRecentContactHistory((current) => {
      const merged = [...normalizedContacts, ...current].reduce<SearchHistoryContact[]>((acc, nextItem) => {
        if (acc.some((item) => item.user_id === nextItem.user_id)) {
          return acc;
        }
        acc.push(nextItem);
        return acc;
      }, []);

      const next = merged.slice(0, 12);
      void AsyncStorage.setItem(SEARCH_CONTACT_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const loadChatUsers = useCallback(async () => {
    if (!chatUserId) return;
    setLoadingUsers(true);
    try {
      const friends = await ChatApi.getFriends(chatUserId);
      setChatUsers(friends);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [chatUserId]);

  useEffect(() => {
    void loadChatUsers();
  }, [loadChatUsers]);

  const loadConversations = useCallback(async (options?: { force?: boolean }) => {
    if (loadConversationsPromiseRef.current) {
      await loadConversationsPromiseRef.current;
      return;
    }

    const force = Boolean(options?.force);
    const now = Date.now();
    if (!force && now - lastConversationsLoadAtRef.current < 800) {
      return;
    }

    const task = (async () => {
      let userIdForChat = chatUserId;
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

        console.error('Failed to load conversations:', error);
        Alert.alert('Lỗi', 'Không thể tải danh sách cuộc trò chuyện');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        lastConversationsLoadAtRef.current = Date.now();
      }
    })();

    loadConversationsPromiseRef.current = task;
    try {
      await task;
    } finally {
      loadConversationsPromiseRef.current = null;
    }
  }, [chatUserId]);

  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      void loadConversationsRef.current();
    }, []),
  );

  useEffect(() => {
    if (!chatUserId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(chatUserId);

    const refreshInbox = () => {
      if (Date.now() < suppressSocketRefreshUntilRef.current) {
        return;
      }
      void loadConversationsRef.current();
    };

    chatSocket.on('tin_nhan', refreshInbox);
    chatSocket.on('tao_phong_moi', refreshInbox);
    chatSocket.on('cap_nhat_nhom', refreshInbox);
    chatSocket.on('cap_nhat_phan_loai', refreshInbox);
    chatSocket.on('roi_nhom', refreshInbox);
    chatSocket.on('xoa_thanh_vien', refreshInbox);
    chatSocket.on('bi_xoa_khoi_nhom', refreshInbox);
    chatSocket.on('giai_tan_nhom', refreshInbox);

    return () => {
      chatSocket.off('tin_nhan', refreshInbox);
      chatSocket.off('tao_phong_moi', refreshInbox);
      chatSocket.off('cap_nhat_nhom', refreshInbox);
      chatSocket.off('cap_nhat_phan_loai', refreshInbox);
      chatSocket.off('roi_nhom', refreshInbox);
      chatSocket.off('xoa_thanh_vien', refreshInbox);
      chatSocket.off('bi_xoa_khoi_nhom', refreshInbox);
      chatSocket.off('giai_tan_nhom', refreshInbox);
    };
  }, [chatUserId]);

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
        const normalized = normalizeSearchResult(payload);
        setSearchResults(normalized);
      } catch (error) {
        console.error('Search failed', error);
        setSearchResults(EMPTY_SEARCH);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText, chatUserId, senderFilter, rememberSearchContacts]);

  useEffect(() => {
    setSearchVisibleCounts(INITIAL_SEARCH_VISIBLE_COUNTS);
  }, [searchText]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadConversations({ force: true });
  }, [loadConversations]);


  const handleToggleCategory = useCallback((categoryId: string) => {
    setDraftCategoryIds((current) =>
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

  const handleClearFilter = useCallback(() => {
    setFilterMode('all');
    setSelectedCategoryIds([]);
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

  const searchAvatarByUserId = useMemo(() => {
    const map = new Map<string, string>();
    (searchResults?.contacts || []).forEach((item) => {
      if (item.user_id && item.avatar) {
        map.set(String(item.user_id), String(item.avatar));
      }
    });
    return map;
  }, [searchResults]);

  const searchAvatarByConversationId = useMemo(() => {
    const map = new Map<string, string>();
    (searchResults?.conversations || []).forEach((item) => {
      if (item.conversation_id && item.avatar) {
        map.set(String(item.conversation_id), String(item.avatar));
      }
    });
    return map;
  }, [searchResults]);

  const inboxAvatarByUserId = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      (item.conversation.participants || []).forEach((participant) => {
        if (participant?.user_id && participant?.avatar && !map.has(String(participant.user_id))) {
          map.set(String(participant.user_id), String(participant.avatar));
        }
      });
    });
    return map;
  }, [items]);

  const inboxAvatarByConversationId = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const conversationId = String(item.conversation._id || '');
      const avatar = getConversationAvatar(item.conversation, chatUserId);
      if (conversationId && avatar) {
        map.set(conversationId, avatar);
      }
    });
    return map;
  }, [items, chatUserId]);

  const hasSearchQuery = searchText.trim().length > 0;

  const openConversation = useCallback(
    (conversationId: string, messageId?: string) => {
      if (!conversationId) return;

      // Save to history when clicking a result
      const matchedConv = items.find(item => String(item.conversation._id || '') === conversationId);
      if (matchedConv) {
        const historyItem = {
          user_id: matchedConv.conversation.type === 'private'
            ? (matchedConv.conversation.participants?.find(p => String(p.user_id) !== String(chatUserId))?.user_id || '')
            : 'group',
          name: matchedConv.conversation.name || 'Đoạn chat',
          avatar: getConversationAvatar(matchedConv.conversation, chatUserId),
          conversation_id: conversationId
        };
        void rememberSearchContacts([{
          user_id: historyItem.user_id,
          name: historyItem.name,
          avatar: historyItem.avatar,
          conversation_ids: [conversationId]
        } as any]);
      }

      const params: any = { conversationId };
      if (messageId) params.highlightedMessageId = messageId;

      router.push({
        pathname: '/chat/[conversationId]',
        params
      } as any);
    },
    [router, items, chatUserId, rememberSearchContacts],
  );

  const handleOpenHistoryConversation = useCallback(
    (historyItem: SearchHistoryContact) => {
      const historyConversationId = String(historyItem.conversation_id || '');

      // If we have a conversation ID, just open it
      if (historyConversationId && historyConversationId !== 'undefined') {
        openConversation(historyConversationId);
        return;
      }

      // Fallback: try to find by user_id
      const fallbackConversation = items.find((item) =>
        (item.conversation.participants || []).some(
          (participant) => String(participant?.user_id || '') === String(historyItem.user_id || ''),
        ),
      );

      const fallbackConversationId = String(fallbackConversation?.conversation._id || '');
      if (fallbackConversationId) {
        openConversation(fallbackConversationId);
        return;
      }

      Alert.alert('Thông báo', 'Hội thoại này không còn tồn tại hoặc không thể mở.');
    },
    [items, openConversation],
  );

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    setIsSearchMode(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  const handleCloseSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchText('');
    setSearchResults(null);
    setSearchTab('all');
    setSenderFilter('');
    setIsSearchFocused(false);
    setIsSearchMode(false);
  }, []);

  const handleClearSearchInput = useCallback(() => {
    // Keyboard.dismiss(); // Keep keyboard if clearing input but staying in search
    setSearchText('');
    setSearchResults(null);
    setSearchTab('all');
    setSenderFilter('');
  }, []);

  const clearContactSearchHistory = useCallback(() => {
    setRecentContactHistory([]);
    void AsyncStorage.removeItem(SEARCH_CONTACT_HISTORY_KEY);
  }, []);

  const handleTogglePinConversation = useCallback(
    async (item: ChatConversationWithParticipant) => {
      if (!chatUserId) return;

      const conversationId = String(item.conversation._id || '');
      if (!conversationId) return;

      try {
        setActionConversationId(conversationId);
        await ChatApi.updatePinStatus(
          conversationId,
          chatUserId,
          !Boolean(item.participant.settings?.is_pinned),
        );
        await loadConversations();
      } catch (error) {
        console.error('Failed to toggle pin status:', error);
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái ghim.');
      } finally {
        setActionConversationId(null);
      }
    },
    [chatUserId, loadConversations],
  );

  const handleToggleMuteConversation = useCallback(
    async (item: ChatConversationWithParticipant) => {
      if (!chatUserId) return;

      const conversationId = String(item.conversation._id || '');
      if (!conversationId) return;

      const currentStatus = item.participant.settings?.notification_status || 'on';
      const nextStatus: 'on' | 'off' = currentStatus === 'off' ? 'on' : 'off';

      try {
        setActionConversationId(conversationId);
        await ChatApi.updateNotificationStatus(conversationId, chatUserId, nextStatus, null);
        await loadConversations();
      } catch (error) {
        console.error('Failed to update notification status:', error);
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái thông báo.');
      } finally {
        setActionConversationId(null);
      }
    },
    [chatUserId, loadConversations],
  );

  const handleDeleteConversation = useCallback(
    (item: ChatConversationWithParticipant) => {
      if (!chatUserId) return;

      const conversationId = String(item.conversation._id || '');
      if (!conversationId) return;

      Alert.alert('Xóa cuộc trò chuyện', 'Bạn có chắc muốn xóa cuộc trò chuyện này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setActionConversationId(conversationId);
                suppressSocketRefreshUntilRef.current = Date.now() + 2000;
                await ChatApi.deleteConversationForMe(conversationId, chatUserId);
                await loadConversations({ force: true });
              } catch (error) {
                console.error('Failed to delete conversation:', error);
                Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện.');
              } finally {
                setActionConversationId(null);
              }
            })();
          },
        },
      ]);
    },
    [chatUserId, loadConversations],
  );

  const handleOpenConversationCategory = useCallback((item: ChatConversationWithParticipant) => {
    setCategoryTargetConversation(item);
    setConversationCategoryPickerVisible(true);
  }, []);

  const handleSelectConversationCategory = useCallback(
    async (categoryId?: string | null) => {
      if (!chatUserId || !categoryTargetConversation) return;

      const conversationId = String(categoryTargetConversation.conversation._id || '');
      if (!conversationId) return;

      try {
        setActionConversationId(conversationId);
        await ChatApi.updateConversationCategory(conversationId, chatUserId, categoryId ?? null);
        setConversationCategoryPickerVisible(false);
        setCategoryTargetConversation(null);
        await loadConversations();
      } catch (error) {
        console.error('Failed to update conversation category:', error);
        Alert.alert('Lỗi', 'Không thể cập nhật phân loại cho hội thoại.');
      } finally {
        setActionConversationId(null);
      }
    },
    [categoryTargetConversation, chatUserId, loadConversations],
  );

  const selectedConversationCategoryId = useMemo(() => {
    const rawValue = categoryTargetConversation?.participant.settings?.category_id;
    return rawValue ? String(rawValue) : '';
  }, [categoryTargetConversation]);

  const deleteHistoryItem = useCallback((userId: string) => {
    setRecentContactHistory((current) => {
      const updated = current.filter((item) => item.user_id !== userId);
      void AsyncStorage.setItem(SEARCH_CONTACT_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME_COLORS.surface.sunken }} edges={['left', 'right']}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

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

      <AddFriendModal
        visible={addFriendVisible}
        onClose={() => setAddFriendVisible(false)}
      />

      <HomeTopSection
        onCreateConversation={() => setCreateGroupVisible(true)}
        onAddFriend={() => setAddFriendVisible(true)}
        onOpenFilter={() => setFilterVisible(true)}
        onClearFilter={handleClearFilter}
        filterMode={filterMode}
        selectedCategoryCount={selectedCategoryIds.length}
        conversationCount={filteredItems.length}
        categoryColor={firstSelectedCategory?.color || undefined}
        onOpenQrScanner={() => router.push('/qr-scan' as any)}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        onClearSearch={handleClearSearchInput}
        onCloseSearch={handleCloseSearch}
        isSearchMode={isSearchMode}
        isSearchFocused={isSearchFocused}
      />

      <View className="flex-1 pt-2">
        {isSearchMode ? (
          <HomeSearchPanel
            searchLoading={searchLoading}
            searchText={searchText}
            searchResults={searchResults}
            searchTab={searchTab}
            senderFilter={senderFilter}
            searchVisibleCounts={searchVisibleCounts}
            recentContactHistory={recentContactHistory}
            isEditingHistory={isEditingHistory}
            onToggleEditHistory={() => setIsEditingHistory((current) => !current)}
            onOpenHistoryConversation={handleOpenHistoryConversation}
            onDeleteHistoryItem={deleteHistoryItem}
            onClearHistory={clearContactSearchHistory}
            onOpenConversation={openConversation}
            onLoadMore={(section) => {
              setSearchVisibleCounts((current) => ({
                ...current,
                [section]: current[section] + SEARCH_LOAD_MORE_STEP,
              }));
            }}
            searchAvatarByUserId={searchAvatarByUserId}
            searchAvatarByConversationId={searchAvatarByConversationId}
            inboxAvatarByUserId={inboxAvatarByUserId}
            inboxAvatarByConversationId={inboxAvatarByConversationId}
          />
        ) : (
          <HomeConversationList
            items={filteredItems}
            categoryById={categoryById}
            currentUserId={chatUserId || undefined}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onOpenConversation={openConversation}
            onTogglePinConversation={handleTogglePinConversation}
            onToggleMuteConversation={handleToggleMuteConversation}
            onOpenConversationCategory={handleOpenConversationCategory}
            onDeleteConversation={handleDeleteConversation}
            actionConversationId={actionConversationId}
          />
        )}
      </View>

      <Modal
        visible={conversationCategoryPickerVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setConversationCategoryPickerVisible(false);
          setCategoryTargetConversation(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => {
              setConversationCategoryPickerVisible(false);
              setCategoryTargetConversation(null);
            }}
          />
          <View className="rounded-2xl bg-white px-4 py-4">
            <Text className="mb-3 text-[17px] font-semibold text-slate-900">Phân loại hội thoại</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {!!selectedConversationCategoryId && (
                <Pressable
                  onPress={() => void handleSelectConversationCategory(null)}
                  className="mb-2 flex-row items-center rounded-xl border border-slate-200 px-3 py-3"
                >
                  <Feather name="x-circle" size={16} color={THEME_COLORS.neutral.slate500} />
                  <Text className="ml-2 text-[15px] text-slate-700">Bỏ phân loại</Text>
                </Pressable>
              )}

              {categories.map((category) => (
                <Pressable
                  key={category._id}
                  onPress={() => void handleSelectConversationCategory(category._id)}
                  className="mb-2 flex-row items-center rounded-xl border px-3 py-3"
                  style={{
                    borderColor:
                      selectedConversationCategoryId === category._id
                        ? category.color || THEME_COLORS.primary[500]
                        : THEME_COLORS.neutral.slate300,
                    backgroundColor:
                      selectedConversationCategoryId === category._id
                        ? 'rgba(148,163,184,0.08)'
                        : '#FFFFFF',
                  }}
                >
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color || THEME_COLORS.neutral.slate400 }}
                  />
                  <Text className="ml-2 flex-1 text-[15px] text-slate-800">{category.name}</Text>
                  {selectedConversationCategoryId === category._id && (
                    <Feather name="check" size={16} color={category.color || THEME_COLORS.primary[600]} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CreateGroupModal
        visible={createGroupVisible}
        users={chatUsers.filter((u) => u.user_id !== chatUserId)}
        loadingUsers={loadingUsers}
        onClose={() => setCreateGroupVisible(false)}
        onCreate={async (name, memberIds, avatarUri) => {
          if (!chatUserId) {
            Alert.alert('Lỗi', 'Vui lòng chọn tài khoản chat trước');
            return;
          }
          try {
            await ChatApi.createConversation({
              creatorId: chatUserId,
              type: 'group',
              name,
              memberIds,
              avatar: avatarUri || '',
            });
            setCreateGroupVisible(false);
            await loadConversations({ force: true });
          } catch (error) {
            console.error('Failed to create group:', error);
            Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
          }
        }}
      />

    </SafeAreaView>
  );
}

