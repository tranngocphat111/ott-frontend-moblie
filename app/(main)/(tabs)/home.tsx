import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/Authcontext';
import { ChatApi, chatSocket } from '@/services/api';
import { THEME_COLORS } from '@/constants/theme';
import { getConversationAvatar, getConversationTitle, resolveMediaUrl } from '@/utils/chat';
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
const VIRTUAL_CONV_PREFIX = 'VIRTUAL_CONV_';
const VIRTUAL_CONV_CACHE_KEY = 'ott-chat-virtual-conv-cache';

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
  phone?: string;
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

const normalizeSearchResult = (payload: any, currentUserId?: string): ChatSearchResult => {
  const contacts: ChatSearchContactItem[] = Array.isArray(payload?.contacts)
    ? payload.contacts.map((user: any) => ({
        user_id: user.user_id,
        name: user.name || user.phone || 'Người dùng',
        avatar: user.avatar,
        phone: user.phone,
        conversation_ids: user.conversation_ids || [],
      }))
    : [];

  const conversations = Array.isArray(payload?.conversations)
    ? payload.conversations.map((item: any) => ({
        ...item,
        name: item.name || getConversationTitle(item as any, currentUserId) || 'Cuộc trò chuyện'
      }))
    : [];

  const result: ChatSearchResult = {
    contacts,
    conversations,
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
  const isFocused = useIsFocused();
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
  const [virtualConversationsCache, setVirtualConversationsCache] = useState<Record<string, ChatConversationWithParticipant>>({});

  const loadUsersPromiseRef = useRef<Promise<ChatServiceUser[]> | null>(null);
  const loadConversationsPromiseRef = useRef<Promise<void> | null>(null);
  const lastConversationsLoadAtRef = useRef(0);
  const loadConversationsRef = useRef<(options?: { force?: boolean }) => Promise<void>>(async () => undefined);
  const suppressSocketRefreshUntilRef = useRef(0);



  useEffect(() => {
    void (async () => {
      try {
        const [storedHistory, storedCache] = await Promise.all([
          AsyncStorage.getItem(SEARCH_CONTACT_HISTORY_KEY),
          AsyncStorage.getItem(VIRTUAL_CONV_CACHE_KEY)
        ]);

        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory)) {
            const normalized = parsedHistory
              .filter((item) => item && typeof item === 'object' && typeof item.user_id === 'string')
              .map((item) => ({
                user_id: String(item.user_id),
                conversation_id: item.conversation_id ? String(item.conversation_id) : undefined,
                name: String(item.name || item.user_id),
                avatar: item.avatar ? String(item.avatar) : undefined,
                phone: item.phone ? String(item.phone) : undefined,
              }))
              .slice(0, 12);
            setRecentContactHistory(normalized);
          }
        }

        if (storedCache) {
          setVirtualConversationsCache(JSON.parse(storedCache));
        }
      } catch (error) {
        console.warn('Cannot load search data.', error);
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
        name: String(contact.name || contact.user_id || 'Người dùng'),
        avatar: contact.avatar,
        phone: contact.phone,
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
    const force = Boolean(options?.force);
    const now = Date.now();
    if (!force && now - lastConversationsLoadAtRef.current < 1500) {
      return;
    }

    if (loadConversationsPromiseRef.current) {
      await loadConversationsPromiseRef.current;
      // After waiting for a previous request, check the throttle again
      const afterWaitNow = Date.now();
      if (!force && afterWaitNow - lastConversationsLoadAtRef.current < 1500) {
        return;
      }
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
      // Only refresh if the home screen is active
      if (!isFocused) return;

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
    chatSocket.on('bi_chan_khoi_nhom', refreshInbox);
    chatSocket.on('thanh_vien_bi_chan', refreshInbox);
    chatSocket.on('giai_tan_nhom', refreshInbox);
    chatSocket.on('cap_nhat_quan_he', refreshInbox);

    return () => {
      chatSocket.off('tin_nhan', refreshInbox);
      chatSocket.off('tao_phong_moi', refreshInbox);
      chatSocket.off('cap_nhat_nhom', refreshInbox);
      chatSocket.off('cap_nhat_phan_loai', refreshInbox);
      chatSocket.off('roi_nhom', refreshInbox);
      chatSocket.off('xoa_thanh_vien', refreshInbox);
      chatSocket.off('bi_xoa_khoi_nhom', refreshInbox);
      chatSocket.off('bi_chan_khoi_nhom', refreshInbox);
      chatSocket.off('thanh_vien_bi_chan', refreshInbox);
      chatSocket.off('giai_tan_nhom', refreshInbox);
      chatSocket.off('cap_nhat_quan_he', refreshInbox);
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

    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const payload = await ChatApi.searchEverything(chatUserId, keyword, {
          limit: 24,
          senderId: senderFilter || undefined,
        });

        if (!isCurrent) return;

        const normalized = normalizeSearchResult(payload, chatUserId);

        // Logic tìm người lạ qua số điện thoại (giống Web)
        const isPhoneNumber = /^\d{8,15}$/.test(keyword);
        if (isPhoneNumber) {
          const hasInContacts = normalized.contacts.some(c => c.phone === keyword || c.name === keyword);
          const hasInConversations = normalized.conversations.some(c => c.name === keyword);

          if (!hasInContacts && !hasInConversations) {
            try {
              const stranger = await ChatApi.getUserByPhone(keyword, chatUserId);
              if (!isCurrent) return;

              if (stranger && stranger.user_id !== chatUserId) {
                // 1. Check if the server returned an existing conversation ID
                const serverConvId = (stranger as any).conversation_id;
                
                // 2. Check if we already have a conversation with this user in local items
                const existingLocal = items.find(item => 
                  item.conversation.type === 'private' && 
                  item.conversation.participants?.some(p => String(p.user_id) === String(stranger.user_id))
                );

                const finalConvId = serverConvId || existingLocal?.conversation._id;

                if (finalConvId) {
                  normalized.contacts.push({
                    user_id: stranger.user_id,
                    name: stranger.name || stranger.phone || 'Người lạ',
                    avatar: stranger.avatar,
                    phone: stranger.phone,
                    conversation_ids: [finalConvId]
                  });
                  normalized.total += 1;
                } else {
                  const virtualId = `${VIRTUAL_CONV_PREFIX}${stranger.user_id}`;
                  const virtualConv: ChatConversationWithParticipant = {
                    conversation: {
                      _id: virtualId,
                      type: 'private',
                      name: stranger.name || stranger.phone || 'Người lạ',
                      avatar: stranger.avatar || '',
                      participants: [
                        { user_id: chatUserId, display_name: 'Bạn' } as any,
                        { user_id: stranger.user_id, display_name: stranger.name || 'Người lạ', avatar: stranger.avatar } as any
                      ]
                    } as any,
                    participant: {
                      user_id: chatUserId,
                      conversation_id: virtualId,
                      settings: { is_pinned: false, notification_status: 'on' }
                    } as any
                  };

                  // Thêm vào cache và kết quả tìm kiếm
                  setVirtualConversationsCache(prev => {
                    const next = { ...prev, [virtualId]: virtualConv };
                    void AsyncStorage.setItem(VIRTUAL_CONV_CACHE_KEY, JSON.stringify(next));
                    return next;
                  });

                  normalized.contacts.push({
                    user_id: stranger.user_id,
                    name: stranger.name || stranger.phone || 'Người lạ',
                    avatar: stranger.avatar,
                    phone: stranger.phone,
                    conversation_ids: [virtualId]
                  });
                  normalized.total += 1;
                }
              }
            } catch (err) {
              console.log('Stranger search failed or user not found');
            }
          }
        }

        if (isCurrent) {
          setSearchResults(normalized);
        }
      } catch (error) {
        console.error('Search failed', error);
        if (isCurrent) {
          setSearchResults(EMPTY_SEARCH);
        }
      } finally {
        if (isCurrent) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
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
    const obj: Record<string, string> = {};
    (searchResults?.contacts || []).forEach((item) => {
      if (item.user_id && item.avatar) {
        obj[String(item.user_id)] = String(item.avatar);
      }
    });
    return obj;
  }, [searchResults]);

  const searchAvatarByConversationId = useMemo(() => {
    const obj: Record<string, string> = {};
    (searchResults?.conversations || []).forEach((item) => {
      if (item.conversation_id && item.avatar) {
        obj[String(item.conversation_id)] = String(item.avatar);
      }
    });
    return obj;
  }, [searchResults]);

  const inboxAvatarByUserId = useMemo(() => {
    const obj: Record<string, string> = {};
    items.forEach((item) => {
      (item.conversation.participants || []).forEach((participant) => {
        if (participant?.user_id && participant?.avatar && !obj[String(participant.user_id)]) {
          obj[String(participant.user_id)] = String(participant.avatar);
        }
      });
    });
    return obj;
  }, [items]);

  const inboxAvatarByConversationId = useMemo(() => {
    const obj: Record<string, string> = {};
    items.forEach((item) => {
      const conversationId = String(item.conversation._id || '');
      const avatar = getConversationAvatar(item.conversation, chatUserId);
      if (conversationId && avatar) {
        obj[conversationId] = avatar;
      }
    });
    return obj;
  }, [items, chatUserId]);

  const hasSearchQuery = searchText.trim().length > 0;

  const openConversation = useCallback(
    async (conversationId: string, messageId?: string, contactId?: string) => {
      let targetConvId = conversationId;
      if (!targetConvId && !contactId) return;

      let targetConv: ChatConversationWithParticipant | undefined;

      // 1. If contactId is provided, PRIORITIZE finding a private conversation with them locally
      if (contactId) {
        const localPrivateConv = items.find(c => 
          c.conversation.type === 'private' && 
          c.conversation.participants?.some(p => String(p.user_id) === String(contactId))
        );
        if (localPrivateConv) {
          targetConv = localPrivateConv;
          targetConvId = localPrivateConv.conversation._id;
        }
      }

      // 2. If not found yet and targetConvId is provided, try to find by ID
      if (!targetConv && targetConvId) {
        targetConv = items.find(
          (item) => String(item.conversation._id || '') === targetConvId,
        );

        // If not in main items, check Virtual Cache
        if (!targetConv && targetConvId.startsWith(VIRTUAL_CONV_PREFIX)) {
          targetConv = virtualConversationsCache[targetConvId];
        }
      }

      // 3. If still not found and we have a contactId, try to find on server (for hidden/deleted chats)
      if (!targetConv && contactId && chatUserId) {
        try {
          // This API call effectively acts as a findPrivateConversation
          const response = await ChatApi.createConversation({
            creatorId: chatUserId,
            type: 'private',
            memberIds: [contactId],
          });
          const fetchedConv = response?._id ? response : (response?.conversation || null);
          
          if (fetchedConv && fetchedConv._id && !String(fetchedConv._id).startsWith(VIRTUAL_CONV_PREFIX)) {
            targetConv = {
              conversation: fetchedConv,
              participant: {
                user_id: chatUserId,
                conversation_id: String(fetchedConv._id),
                settings: { is_pinned: false, notification_status: 'on' }
              } as any
            };
            targetConvId = String(fetchedConv._id);
          }
        } catch (err) {
          console.log('Lazy find on server failed:', err);
        }
      }

      // 4. If still not found but targetConvId is a real ID, fetch from server (hidden/deleted chats)
      if (!targetConv && targetConvId && !targetConvId.startsWith(VIRTUAL_CONV_PREFIX)) {
        try {
          const fetched = await ChatApi.getConversationById(targetConvId);
          if (fetched) {
            targetConv = {
              conversation: fetched,
              participant: {
                user_id: chatUserId,
                conversation_id: targetConvId,
                settings: { is_pinned: false, notification_status: 'on' }
              } as any
            };
          }
        } catch (err) {
          console.error('Failed to fetch hidden conversation:', err);
        }
      }

      // 4. If still not found but we have a contactId, create a virtual conversation object (stranger)
      if (!targetConv && contactId && chatUserId) {
        try {
          const targetUser = await ChatApi.getUserById(contactId);
          if (targetUser) {
            const virtualId = `${VIRTUAL_CONV_PREFIX}${contactId}`;
            targetConvId = virtualId;
            targetConv = {
              conversation: {
                _id: virtualId,
                type: 'private',
                name: targetUser.name || 'Người dùng',
                avatar: targetUser.avatar || '',
                participants: [
                  { user_id: chatUserId, display_name: 'Bạn' } as any,
                  { user_id: contactId, display_name: targetUser.name || 'Người dùng', avatar: targetUser.avatar } as any
                ]
              } as any,
              participant: {
                user_id: chatUserId,
                conversation_id: virtualId,
                settings: { is_pinned: false, notification_status: 'on' }
              } as any
            };
            
            // Cache it
            setVirtualConversationsCache(prev => {
              const next = { ...prev, [virtualId]: targetConv! };
              void AsyncStorage.setItem(VIRTUAL_CONV_CACHE_KEY, JSON.stringify(next));
              return next;
            });
          }
        } catch (err) {
          console.error('Failed to get user for virtual conversation:', err);
        }
      }

      if (!targetConv) {
        Alert.alert('Thông báo', 'Không thể mở cuộc hội thoại này.');
        return;
      }

      // Save to history
      const historyItem = {
        user_id: targetConv.conversation.type === 'private'
          ? (targetConv.conversation.participants?.find(p => String(p.user_id) !== String(chatUserId))?.user_id || '')
          : 'group',
        name: getConversationTitle(targetConv.conversation, chatUserId),
        avatar: getConversationAvatar(targetConv.conversation, chatUserId),
        conversation_id: targetConvId
      };

      void rememberSearchContacts([{
        user_id: historyItem.user_id,
        name: historyItem.name,
        avatar: historyItem.avatar,
        conversation_ids: [targetConvId]
      } as any]);

      const params: any = {
        conversationId: targetConvId,
        title: getConversationTitle(targetConv.conversation, chatUserId),
        avatar: getConversationAvatar(targetConv.conversation, chatUserId)
      };
      if (messageId) params.highlightedMessageId = messageId;

      router.push({
        pathname: '/chat/[conversationId]',
        params
      } as any);
    },
    [router, items, chatUserId, rememberSearchContacts, virtualConversationsCache],
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
    // Reset search results and text together to avoid intermediate states
    setSearchResults(null);
    setSearchText('');
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

  const handleToggleBlockUser = useCallback(
    async (item: ChatConversationWithParticipant, relationship?: any) => {
      if (!chatUserId) return;
      const otherParticipant = item.conversation.participants?.find(
        (p) => String(p.user_id) !== String(chatUserId),
      );
      if (!otherParticipant) return;

      const otherId = String(otherParticipant.user_id);
      const otherName =
        otherParticipant.nickname ||
        otherParticipant.name ||
        otherParticipant.display_name ||
        "Người dùng";

      const rel = relationship;
      const isBlockedByMe = (rel?.status === 'BLOCKED' || rel?.status === 'BLOCKED_BY_ME') && String(rel?.requester_id || rel?.requesterId) === String(chatUserId);

      if (isBlockedByMe) {
        Alert.alert(
          "Bỏ chặn",
          `Bạn có muốn bỏ chặn ${otherName}?`,
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Bỏ chặn",
              onPress: async () => {
                try {
                  setActionConversationId(item.conversation._id);
                  await ChatApi.unblockUser(chatUserId, otherId);
                  Alert.alert("Thành công", `Đã bỏ chặn ${otherName}`);
                  void loadConversations({ force: true });
                } catch (error) {
                  Alert.alert("Lỗi", "Không thể bỏ chặn người dùng");
                } finally {
                  setActionConversationId(null);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Chặn người dùng",
          `Bạn có chắc muốn chặn ${otherName}? Hai người sẽ không thể gửi tin nhắn cho nhau.`,
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Chặn",
              style: "destructive",
              onPress: async () => {
                try {
                  setActionConversationId(item.conversation._id);
                  await ChatApi.blockUser(chatUserId, otherId);
                  Alert.alert("Thành công", `Đã chặn ${otherName}`);
                  void loadConversations({ force: true });
                } catch (error) {
                  Alert.alert("Lỗi", "Không thể chặn người dùng");
                } finally {
                  setActionConversationId(null);
                }
              },
            },
          ],
        );
      }
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
        onOpenNotifications={() => router.push('/(main)/notifications' as any)}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        onClearSearch={handleClearSearchInput}
        onCloseSearch={handleCloseSearch}
        isSearchMode={isSearchMode}
        isSearchFocused={isSearchFocused}
      />

      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {isSearchMode ? (
          searchText.trim().length > 0 ? (
            <HomeSearchPanel
              searchLoading={searchLoading}
              searchText={searchText}
              searchResults={searchResults}
              searchTab={searchTab}
              senderFilter={senderFilter}
              searchVisibleCounts={searchVisibleCounts}
              onOpenConversation={openConversation}
              onLoadMore={(section) => {
                setSearchVisibleCounts((current) => ({
                  ...current,
                  [section as keyof typeof current]: (current[section as keyof typeof current] || 0) + SEARCH_LOAD_MORE_STEP,
                }));
              }}
              searchAvatarByUserId={searchAvatarByUserId}
              searchAvatarByConversationId={searchAvatarByConversationId}
              inboxAvatarByUserId={inboxAvatarByUserId}
              inboxAvatarByConversationId={inboxAvatarByConversationId}
            />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {recentContactHistory.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-[16px] font-bold text-slate-800">Tìm kiếm gần đây</Text>
                    <Pressable onPress={() => setIsEditingHistory((v) => !v)}>
                      <Text className="text-[14px] font-medium text-primary-600">
                        {isEditingHistory ? 'Xong' : 'Sửa'}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="rounded-2xl bg-white p-2 shadow-sm">
                    {recentContactHistory.map((histItem: SearchHistoryContact, index: number) => (
                      <Pressable
                        key={histItem.user_id}
                        onPress={() => handleOpenHistoryConversation(histItem)}
                        className={`flex-row items-center px-3 py-3 ${index < recentContactHistory.length - 1 ? 'border-b border-slate-50' : ''}`}
                      >
                        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary-50">
                          {histItem.avatar ? (
                            <Image source={{ uri: resolveMediaUrl(histItem.avatar) }} className="h-full w-full" />
                          ) : (
                            <Text className="text-[15px] font-bold text-primary-600">
                              {String(histItem.name || histItem.user_id || '?').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text className="ml-3 flex-1 text-[15px] font-medium text-slate-700" numberOfLines={1}>
                          {String(histItem.name || histItem.phone || 'Người dùng')}
                        </Text>
                        {isEditingHistory && (
                          <Pressable
                            onPress={() => deleteHistoryItem(histItem.user_id)}
                            className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-red-50"
                          >
                            <Feather name="trash-2" size={16} color={THEME_COLORS.neutral.red500} />
                          </Pressable>
                        )}
                      </Pressable>
                    ))}
                    {isEditingHistory && (
                      <Pressable
                        onPress={clearContactSearchHistory}
                        className="mt-2 items-center py-2"
                      >
                        <Text className="text-[14px] font-semibold text-red-600">Xóa tất cả lịch sử</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="mb-4 text-[15px] font-bold text-slate-800 uppercase tracking-wider">Gợi ý tìm kiếm</Text>
                <View className="mb-4 flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Feather name="user" size={20} color={THEME_COLORS.primary[600]} />
                  </View>
                  <View className="ml-3">
                    <Text className="text-[15px] font-semibold text-slate-800">Tìm kiếm bạn bè</Text>
                    <Text className="text-[13px] text-slate-500">Theo tên hoặc số điện thoại</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                    <Feather name="message-square" size={20} color="#9333ea" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-[15px] font-semibold text-slate-800">Tìm tin nhắn</Text>
                    <Text className="text-[13px] text-slate-500">Từ khóa trong hội thoại</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )
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
            onBlockUser={handleToggleBlockUser}
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
          <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16 }}>
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

