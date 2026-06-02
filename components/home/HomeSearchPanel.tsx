import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME_COLORS } from '@/constants/theme';
import { resolveMediaUrl } from '@/utils/chat';
import { parseBackendDate } from '@/utils/time';
import type {
  ChatSearchContactItem,
  ChatSearchFileItem,
  ChatSearchMessageItem,
  ChatSearchResult,
} from '@/services/api/chat';

interface HomeSearchPanelProps {
  searchLoading: boolean;
  searchText: string;
  searchResults: ChatSearchResult | null;
  searchTab: 'all' | 'contacts' | 'conversations' | 'messages' | 'files';
  senderFilter: string;
  searchVisibleCounts: Record<string, number>;
  onOpenConversation: (
    conversationId: string,
    messageId?: string,
    contactId?: string,
    options?: { rememberSearchHistory?: boolean },
  ) => void;
  onLoadMore: (section: 'conversations' | 'messages' | 'files' | 'media') => void;
  searchAvatarByUserId: Record<string, string>;
  searchAvatarByConversationId: Record<string, string>;
  inboxAvatarByUserId: Record<string, string>;
  inboxAvatarByConversationId: Record<string, string>;
}

interface SearchAvatarProps {
  label: string;
  avatar?: string;
  icon?: keyof typeof Feather.glyphMap;
}

const SearchAvatar = ({ label, avatar, icon }: SearchAvatarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <View className="h-11 w-11 overflow-hidden rounded-2xl bg-primary-600/12 items-center justify-center">
      {avatar ? (
        <Image source={{ uri: resolveMediaUrl(avatar) }} className="h-full w-full" />
      ) : icon ? (
        <Feather name={icon as any} size={20} color={THEME_COLORS.primary[600]} />
      ) : (
        <Text className="text-[15px] font-bold text-primary-700">{getInitials(label)}</Text>
      )}
    </View>
  );
};

const SearchSectionHeader = ({ label, count }: { label: string; count: number }) => (
  <View className="mb-2 flex-row items-center justify-between">
    <Text className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">{label}</Text>
    <View className="rounded-full bg-slate-100 px-2 py-0.5">
      <Text className="text-[11px] font-bold text-slate-500">{count}</Text>
    </View>
  </View>
);

const previewMessage = (item: ChatSearchMessageItem) => {
  return String(item.preview || '').trim() || '[Tin nhắn]';
};

const previewFile = (item: ChatSearchFileItem) => String(item.file_name || item.key || '').trim() || '[Tệp]';

interface SearchResultRow {
  type: 'contact' | 'conversation';
  key: string;
  label: string;
  avatar?: string;
  icon?: keyof typeof Feather.glyphMap;
  conversationId?: string;
  contactId?: string;
}

export function HomeSearchPanel({
  searchLoading,
  searchText,
  searchResults,
  searchTab,
  senderFilter,
  searchVisibleCounts,
  onOpenConversation,
  onLoadMore,
  searchAvatarByUserId,
  searchAvatarByConversationId,
  inboxAvatarByUserId,
  inboxAvatarByConversationId,
}: HomeSearchPanelProps) {
  
  const mergedConversationResults = useMemo<SearchResultRow[]>(() => {
    if (!searchResults) return [];

    const conversationIds = new Set<string>();

    const conversationRows: SearchResultRow[] = (searchResults.conversations || []).map((item) => {
      const id = String(item.conversation_id || '');
      conversationIds.add(id);
      return {
        type: 'conversation' as const,
        key: `conv-${id}`,
        label: item.name || 'Cuộc trò chuyện',
        avatar: searchAvatarByConversationId[id] || inboxAvatarByConversationId[id] || item.avatar,
        icon: item.type === 'group' ? 'users' : 'user',
        conversationId: id,
        contactId: (item as any).contact_id,
      };
    });

    const contactRows: SearchResultRow[] = (searchResults.contacts || [])
      .map((item: ChatSearchContactItem) => ({
        type: 'contact' as const,
        key: `contact-${item.user_id}`,
        label: item.name || item.phone || 'Người dùng',
        avatar: searchAvatarByUserId[String(item.user_id)] || inboxAvatarByUserId[String(item.user_id)] || item.avatar,
        icon: 'user' as const,
        conversationId: item.conversation_ids?.[0] ? String(item.conversation_ids[0]) : '',
        contactId: String(item.user_id),
      }))
      .filter((item) => (item.conversationId ? !conversationIds.has(item.conversationId) : true));

    const all = [...conversationRows, ...contactRows];
    const query = searchText.toLowerCase();
    const sorted = all.sort((a, b) => {
      const aMatch = a.label.toLowerCase().includes(query);
      const bMatch = b.label.toLowerCase().includes(query);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    return sorted;
  }, [searchResults, searchText, searchAvatarByUserId, searchAvatarByConversationId, inboxAvatarByUserId, inboxAvatarByConversationId]);

  if (searchLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
        <Text style={{ color: '#64748b' }}>Đang tìm kiếm...</Text>
      </View>
    );
  }

  if (searchText.trim().length === 0) {
    return null;
  }

  const hasResults = 
    mergedConversationResults.length > 0 || 
    (searchResults?.messages || []).length > 0 || 
    (searchResults?.files || []).length > 0 || 
    (searchResults?.media || []).length > 0;

  if (!searchResults || !hasResults) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 }}>
        <Text style={{ color: '#94a3b8', textAlign: 'center' }}>Không tìm thấy kết quả phù hợp</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {(searchTab === 'all' || searchTab === 'conversations') && mergedConversationResults.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <SearchSectionHeader label="Hội thoại và liên hệ" count={mergedConversationResults.length} />
            <View className="rounded-2xl bg-white p-2 shadow-sm">
              {mergedConversationResults.slice(0, searchVisibleCounts.conversations).map((item, index) => (
                <Pressable
                  key={item.key}
                  onPress={() =>
                    onOpenConversation(item.conversationId || '', undefined, item.contactId, {
                      rememberSearchHistory: true,
                    })
                  }
                  className={`flex-row items-center px-3 py-3 ${index < Math.min(mergedConversationResults.length, searchVisibleCounts.conversations) - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <SearchAvatar label={item.label} avatar={item.avatar} icon={item.icon} />
                  <Text className="ml-3 flex-1 text-[15px] font-medium text-slate-800" numberOfLines={1}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color="#cbd5e1" />
                </Pressable>
              ))}
              {mergedConversationResults.length > searchVisibleCounts.conversations && (
                <Pressable onPress={() => onLoadMore('conversations')} className="items-center py-2">
                  <Text className="text-[13px] font-semibold text-primary-600">Xem thêm</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'messages') && (searchResults.messages || []).length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <SearchSectionHeader label="Tin nhắn" count={(searchResults.messages || []).length} />
            <View className="rounded-2xl bg-white p-2 shadow-sm">
              {(searchResults.messages || [])
                .filter((item) => !senderFilter || String(item.sender_id || '') === senderFilter)
                .slice(0, searchVisibleCounts.messages)
                .map((item, index) => (
                  <Pressable
                    key={item._id}
                    onPress={() =>
                      onOpenConversation(String(item.conversation_id || ''), String(item.msg_id || ''), undefined, {
                        rememberSearchHistory: true,
                      })
                    }
                    className={`flex-row items-start px-3 py-3 ${index < Math.min((searchResults.messages || []).length, searchVisibleCounts.messages) - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    <SearchAvatar 
                      label={item.sender_name || 'User'} 
                      avatar={searchAvatarByUserId[String(item.sender_id)] || inboxAvatarByUserId[String(item.sender_id)]} 
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[14px] font-semibold text-slate-800">{item.sender_name || 'Người dùng'}</Text>
                        <Text className="text-[11px] text-slate-400">
                          {parseBackendDate(item.createdAt)?.toLocaleDateString('vi-VN') || ''}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-[13px] text-slate-600" numberOfLines={2}>{previewMessage(item)}</Text>
                    </View>
                  </Pressable>
                ))}
            </View>
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'files') && ((searchResults.files || []).length > 0 || (searchResults.media || []).length > 0) && (
          <View style={{ marginBottom: 24 }}>
            <SearchSectionHeader label="Tệp và Phương tiện" count={(searchResults.files || []).length + (searchResults.media || []).length} />
            <View className="rounded-2xl bg-white p-2 shadow-sm">
              {(searchResults.files || []).slice(0, searchVisibleCounts.files).map((item, index) => (
                <Pressable
                  key={item._id}
                  onPress={() =>
                    onOpenConversation(String(item.conversation_id || ''), String(item.msg_id || ''), undefined, {
                      rememberSearchHistory: true,
                    })
                  }
                  className="flex-row items-center px-3 py-3 border-b border-slate-50"
                >
                  <SearchAvatar label="File" icon="file" />
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-semibold text-slate-800" numberOfLines={1}>{previewFile(item)}</Text>
                    <Text className="text-[12px] text-slate-500">Từ: {item.sender_name || 'Người dùng'}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
