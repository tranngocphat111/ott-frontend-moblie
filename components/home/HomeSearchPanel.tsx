import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME_COLORS } from '@/constants/theme';
import { resolveMediaUrl } from '@/utils/chat';
import type {
  ChatSearchContactItem,
  ChatSearchFileItem,
  ChatSearchResult,
} from '@/services/api/chat';
import type { SearchTab } from '@/components/home/HomeTopSection';

export type HomeSearchVisibleCounts = {
  conversations: number;
  messages: number;
  files: number;
  media: number;
};

export type HomeSearchHistoryContact = {
  user_id: string;
  conversation_id?: string;
  name: string;
  avatar?: string;
};

type HomeSearchPanelProps = {
  searchLoading: boolean;
  searchText: string;
  searchResults: ChatSearchResult | null;
  searchTab: SearchTab;
  senderFilter: string;
  searchVisibleCounts: HomeSearchVisibleCounts;
  recentContactHistory: HomeSearchHistoryContact[];
  isEditingHistory: boolean;
  onToggleEditHistory: () => void;
  onOpenHistoryConversation: (item: HomeSearchHistoryContact) => void;
  onDeleteHistoryItem: (userId: string) => void;
  onClearHistory: () => void;
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  onLoadMore: (section: keyof HomeSearchVisibleCounts) => void;
  searchAvatarByUserId: Map<string, string>;
  searchAvatarByConversationId: Map<string, string>;
  inboxAvatarByUserId: Map<string, string>;
  inboxAvatarByConversationId: Map<string, string>;
};

type SearchAvatarProps = {
  label: string;
  avatar?: string | null;
  icon: React.ComponentProps<typeof Feather>['name'];
};

type SearchResultRow = {
  key: string;
  label: string;
  subtitle: string;
  avatar?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  conversationId: string;
};

const getInitials = (label: string) => {
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
};

const normalizeAvatarUri = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|file:|data:)/i.test(raw)) return raw;
  return resolveMediaUrl(raw);
};

const SearchAvatar = ({ label, avatar, icon }: SearchAvatarProps) => {
  const avatarUri = normalizeAvatarUri(avatar);
  const initials = getInitials(label);

  const isSelf = avatar === 'SPECIAL_AVATAR_SELF' ||
                 label?.toLowerCase().includes('my documents') ||
                 label?.toLowerCase().includes('truyền file') ||
                 label?.toLowerCase().includes('cloud của tôi');

  return (
    <View className="h-11 w-11 overflow-hidden rounded-2xl bg-primary-600/12 items-center justify-center">
      {isSelf ? (
        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
          <Text className="text-[18px]">📁</Text>
        </View>
      ) : avatarUri ? (
        <Image source={{ uri: avatarUri }} className="h-full w-full" />
      ) : (
        <View className="h-full w-full items-center justify-center bg-primary-600/12">
          <Feather name={icon} size={16} color={THEME_COLORS.primary[600]} />
          <Text className="mt-0.5 text-[11px] font-bold text-primary-600">{initials}</Text>
        </View>
      )}
    </View>
  );
};

const SearchSectionHeader = ({ label, count }: { label: string; count: number }) => (
  <Text className="mb-2 text-[13px] font-semibold text-slate-700">{`${label} (${count})`}</Text>
);

const previewMessage = (item: any) => {
  if (item.type === 'audio') return 'Tin nhắn thoại';
  if (item.type === 'image') return '[Hình ảnh]';
  if (item.type === 'video') return '[Video]';
  const preview = item?.preview || (Array.isArray(item.content) ? item.content[0] : item.content);
  return String(preview || '').trim() || '[Tin nhắn]';
};

const previewFile = (item: any) => String(item?.file_name || item?.key || '').trim() || '[Tệp]';

export function HomeSearchPanel({
  searchLoading,
  searchText,
  searchResults,
  searchTab,
  senderFilter,
  searchVisibleCounts,
  recentContactHistory,
  isEditingHistory,
  onToggleEditHistory,
  onOpenHistoryConversation,
  onDeleteHistoryItem,
  onClearHistory,
  onOpenConversation,
  onLoadMore,
  searchAvatarByUserId,
  searchAvatarByConversationId,
  inboxAvatarByUserId,
  inboxAvatarByConversationId,
}: HomeSearchPanelProps) {
  const mergedConversationResults = useMemo<SearchResultRow[]>(() => {
    const conversationRows = (searchResults?.conversations || []).map((item) => ({
      key: `conversation:${item.conversation_id}`,
      label: item.name || 'Đoạn chat',
      subtitle: item.type === 'group' ? 'Nhóm' : 'Riêng tư',
      avatar: item.avatar,
      icon: (item.type === 'group' ? 'users' : 'message-circle') as SearchResultRow['icon'],
      conversationId: String(item.conversation_id || ''),
    }));

    const conversationIds = new Set(conversationRows.map((item) => item.conversationId).filter(Boolean));
    const contactRows = (searchResults?.contacts || [])
      .map((item: ChatSearchContactItem) => ({
        key: `contact:${item.user_id}`,
        label: item.name || item.phone || 'Liên hệ',
        subtitle: item.phone || 'Liên hệ',
        avatar: item.avatar,
        icon: 'user' as const,
        conversationId: item.conversation_ids?.[0] ? String(item.conversation_ids[0]) : '',
      }))
      .filter((item) => (item.conversationId ? !conversationIds.has(item.conversationId) : true));

    return [...conversationRows, ...contactRows];
  }, [searchResults]);

  if (searchLoading) {
    return (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <Text className="text-[14px] text-slate-500">Đang tìm kiếm...</Text>
      </View>
    );
  }

  if (searchText.trim().length === 0) {
    return (
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {recentContactHistory.length === 0 ? (
          <View className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <Text className="text-[15px] font-semibold text-slate-900">Liên hệ đã tìm</Text>
            <Text className="mt-1 text-[13px] text-slate-500">Chưa có liên hệ nào trong lịch sử tìm kiếm.</Text>
          </View>
        ) : (
          <View className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[15px] font-semibold text-slate-900">Liên hệ đã tìm</Text>
              <Pressable onPress={onToggleEditHistory}>
                <Text className="text-[13px] font-semibold text-primary-600">{isEditingHistory ? 'Xong' : 'Sửa'}</Text>
              </Pressable>
            </View>

            {!isEditingHistory ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="flex-row pt-2 gap-4 pb-1">
                  {recentContactHistory.map((item) => (
                    <Pressable
                      key={item.user_id}
                      onPress={() => onOpenHistoryConversation(item)}
                      className="items-center"
                    >
                      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                        {normalizeAvatarUri(item.avatar) ? (
                          <Image source={{ uri: normalizeAvatarUri(item.avatar) }} className="h-full w-full" />
                        ) : (
                          <Text className="text-[20px] font-bold text-slate-500">{getInitials(item.name || item.user_id)}</Text>
                        )}
                      </View>
                      <Text className="mt-2 max-w-[68px] text-center text-[12px] text-slate-700" numberOfLines={2}>
                        {item.name || item.user_id}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="flex-row pt-2 gap-4 pb-1">
                  {recentContactHistory.map((item) => (
                    <View key={item.user_id} className="items-center">
                      <View className="relative h-16 w-16">
                        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                          {normalizeAvatarUri(item.avatar) ? (
                            <Image source={{ uri: normalizeAvatarUri(item.avatar) }} className="h-full w-full" />
                          ) : (
                            <Text className="text-[20px] font-bold text-slate-500">{getInitials(item.name || item.user_id)}</Text>
                          )}
                        </View>
                        <Pressable
                          onPress={() => onDeleteHistoryItem(item.user_id)}
                          className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-200"
                        >
                          <Feather name="x" size={11} color={THEME_COLORS.neutral.slate700} />
                        </Pressable>
                      </View>
                      <Text className="mt-2 max-w-[68px] text-center text-[12px] text-slate-700" numberOfLines={2}>
                        {item.name || item.user_id}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <Pressable onPress={onClearHistory} className="mt-5 items-center py-2">
              <Text className="text-[14px] font-semibold text-slate-500">Xóa tất cả</Text>
            </Pressable>
          </View>
        )}
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

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 0, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <View className="px-4 pt-4">
        {(searchTab === 'all' || searchTab === 'conversations') && mergedConversationResults.length > 0 && (
          <View className="mb-4">
            <SearchSectionHeader label="Hội thoại" count={mergedConversationResults.length} />
            <View className="rounded-2xl bg-white p-4 shadow-sm">
              {mergedConversationResults.slice(0, searchVisibleCounts.conversations).map((item, index) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (item.conversationId) {
                      onOpenConversation(item.conversationId);
                    }
                  }}
                  className={`flex-row items-center px-3 py-3 ${index < Math.min(mergedConversationResults.length, searchVisibleCounts.conversations) - 1
                    ? 'border-b border-slate-100'
                    : ''
                    }`}
                >
                  <SearchAvatar label={item.label} avatar={item.avatar} icon={item.icon} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[15px] font-semibold text-slate-900">{item.label}</Text>
                    <Text className="mt-0.5 text-[12px] text-slate-500">{item.subtitle}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={THEME_COLORS.neutral.slate400} />
                </Pressable>
              ))}
              {mergedConversationResults.length > searchVisibleCounts.conversations && (
                <Pressable onPress={() => onLoadMore('conversations')} className="mt-1 items-center py-2">
                  <Text className="text-[15px] font-semibold text-slate-700">Xem thêm</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'messages') && (searchResults.messages || []).filter((item) => !senderFilter || String(item.sender_id || '') === senderFilter).length > 0 && (
          <View className="mb-4">
            <SearchSectionHeader label="Tin nhắn" count={(searchResults.messages || []).length} />
            <View className="rounded-2xl bg-white p-4 shadow-sm">
              {(searchResults.messages || [])
                .filter((item) => !senderFilter || String(item.sender_id || '') === senderFilter)
                .slice(0, searchVisibleCounts.messages)
                .map((item, index) => (
                  <Pressable
                    key={item._id}
                    onPress={() => onOpenConversation(String(item.conversation_id || ''), String(item.msg_id || item._id || ''))}
                    className={`flex-row items-start px-3 py-3 ${index < Math.min((searchResults.messages || []).filter((msg) => !senderFilter || String(msg.sender_id || '') === senderFilter).length, searchVisibleCounts.messages) - 1
                      ? 'border-b border-slate-100'
                      : ''
                      }`}
                  >
                    <SearchAvatar
                      label={item.sender_name || item.sender_id || 'Tin nhắn'}
                      avatar={
                        searchAvatarByUserId.get(String(item.sender_id || '')) ||
                        inboxAvatarByUserId.get(String(item.sender_id || '')) ||
                        searchAvatarByConversationId.get(String(item.conversation_id || '')) ||
                        inboxAvatarByConversationId.get(String(item.conversation_id || ''))
                      }
                      icon="message-circle"
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[15px] font-semibold text-slate-900">{item.sender_name || item.sender_id}</Text>
                        <Text className="text-[13px] text-slate-400">
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-[13px] leading-5 text-slate-600" numberOfLines={2}>
                        {previewMessage(item)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </View>
            {(searchResults.messages || []).filter((item) => !senderFilter || String(item.sender_id || '') === senderFilter).length > searchVisibleCounts.messages && (
              <Pressable onPress={() => onLoadMore('messages')} className="items-center pt-3">
                <Text className="text-[15px] font-semibold text-slate-700">Xem thêm</Text>
              </Pressable>
            )}
          </View>
        )}

        {(searchTab === 'all' || searchTab === 'files') && ((searchResults.files || []).length > 0 || (searchResults.media || []).length > 0) && (
          <View className="mb-4">
            <SearchSectionHeader label="Tệp và ghi âm" count={(searchResults.files || []).length + (searchResults.media || []).length} />
            <View className="rounded-2xl bg-white p-4 shadow-sm">
              {(searchResults.files || []).slice(0, searchVisibleCounts.files).map((item: ChatSearchFileItem, index: number) => (
                <Pressable
                  key={item._id}
                  onPress={() => onOpenConversation(String(item.conversation_id || ''), String(item.msg_id || item.message_id || ''))}
                  className={`flex-row items-start px-3 py-3 ${index < Math.min((searchResults.messages || []).filter((msg) => !senderFilter || String(msg.sender_id || '') === senderFilter).length, searchVisibleCounts.messages) - 1
                    ? 'border-b border-slate-100'
                    : ''
                    }`}
                >
                  <SearchAvatar
                    label={item.sender_name || item.sender_id || 'File'}
                    avatar={
                      searchAvatarByUserId.get(String(item.sender_id || '')) ||
                      inboxAvatarByUserId.get(String(item.sender_id || '')) ||
                      searchAvatarByConversationId.get(String(item.conversation_id || '')) ||
                      inboxAvatarByConversationId.get(String(item.conversation_id || ''))
                    }
                    icon="paperclip"
                  />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[14px] font-semibold text-slate-900">{item.sender_name || item.sender_id}</Text>
                      <Text className="text-[11px] text-slate-400">File</Text>
                    </View>
                    <Text className="mt-1 text-[13px] leading-4 text-slate-600" numberOfLines={1}>
                      {previewFile(item)}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {(searchResults.media || []).slice(0, searchVisibleCounts.media).map((item: any, idx: number) => (
                <Pressable
                  key={`${item._id || item.message_id || idx}`}
                  onPress={() => onOpenConversation(String(item.conversation_id || ''), String(item.msg_id || item.message_id || ''))}
                  className={`flex-row items-start px-3 py-3 ${idx < Math.min((searchResults.media || []).length, searchVisibleCounts.media) - 1
                    ? 'border-b border-slate-100'
                    : ''
                    }`}
                >
                  <SearchAvatar
                    label={item.sender_name || item.sender_id || 'Media'}
                    avatar={
                      searchAvatarByUserId.get(String(item.sender_id || '')) ||
                      inboxAvatarByUserId.get(String(item.sender_id || '')) ||
                      searchAvatarByConversationId.get(String(item.conversation_id || '')) ||
                      inboxAvatarByConversationId.get(String(item.conversation_id || ''))
                    }
                    icon="image"
                  />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[14px] font-semibold text-slate-900">{item.sender_name || item.sender_id}</Text>
                      <Text className="text-[11px] text-slate-400">Media</Text>
                    </View>
                    <Text className="mt-1 text-[13px] leading-4 text-slate-600">[{String(item.media_type || 'media').toUpperCase()}]</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {(searchResults.files || []).length + (searchResults.media || []).length > searchVisibleCounts.files + searchVisibleCounts.media && (
              <Pressable
                onPress={() => {
                  onLoadMore('files');
                  onLoadMore('media');
                }}
                className="items-center pt-3"
              >
                <Text className="text-[15px] font-semibold text-slate-700">Xem thêm</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
