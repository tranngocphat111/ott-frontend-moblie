import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, Image as RNImage, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/Authcontext';
import { ChatApi } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';
import { useConversationMessages } from '@/hooks/chat';
import {
  formatMessageTimestampLabel,
  getMessageBodyText,
  getOptimizedImageUrl,
  resolveMediaUrl,
} from '@/utils/chat';
import { ChatPollMessage } from '@/components/chat/message-types/ChatPollMessage';
import { CreatePollModal } from '@/components/chat/modals/CreatePollModal';
import { THEME_COLORS } from '@/constants/theme';


type TabType = 'pinned' | 'poll';

const CHAT_BROWN = '#b78457';
const CHAT_BROWN_LIGHT = '#d2a177';
const CHAT_BROWN_BG = '#fdf8f4';

export default function GroupBulletinBoard() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { user, chatUserId } = useAuth();
  const userIdForChat = chatUserId || user?.id;

  const [tab, setTab] = useState<TabType>('pinned');
  const [pollModalVisible, setPollModalVisible] = useState(false);

  const {
    conversation,
    messages,
    pinnedMessages,
    loadConversation,
  } = useConversationMessages(conversationId, userIdForChat);

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const pollMessages = useMemo(() => {
    return messages.filter((m) => m.type === 'poll');
  }, [messages]);

  // ─── Create Poll ────────────────────────────────────────────────
  const handleCreatePoll = async (data: {
    question: string;
    options: { id: string; name: string; voters: string[] }[];
    multipleChoice: boolean;
  }) => {
    if (!conversationId || !userIdForChat) return;

    try {
      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: 'Khảo sát',
        type: 'poll',
        pollQuestion: data.question,
        pollMultipleChoice: data.multipleChoice,
        pollOptions: data.options,
      });
      Alert.alert('Thành công', 'Đã tạo bình chọn mới');
    } catch (error) {
      console.error('Failed to create poll:', error);
      Alert.alert('Lỗi', 'Không thể tạo bình chọn');
    }
  };

  // ─── Avatar helper ──────────────────────────────────────────────
  const renderAvatar = (name?: string, avatarRaw?: string) => {
    const url =
      getOptimizedImageUrl(avatarRaw || '', 'avatar') ||
      resolveMediaUrl(avatarRaw || '');
    const initial = (name || '?').slice(0, 1).toUpperCase();

    return (
      <View className="h-10 w-10 rounded-full overflow-hidden bg-[#f0e2d5]">
        {url ? (
          <RNImage source={{ uri: url }} className="w-full h-full" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-[14px] font-bold text-[#b78457]">{initial}</Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Pinned message body preview ────────────────────────────────
  const getPinnedPreviewText = (msg: ChatMessage) => {
    if (msg.type === 'image') return '[Hình ảnh]';
    if (msg.type === 'video') return '[Video]';
    if (msg.type === 'audio') return '[Ghi âm]';
    if (msg.type === 'file') return '[Tệp đính kèm]';
    if (msg.type === 'poll') return msg.poll_question || '[Bình chọn]';
    const body = getMessageBodyText(msg);
    return body || '[Tin nhắn]';
  };

  // ─── Render pinned item ─────────────────────────────────────────
  const renderPinnedItem = ({ item }: { item: ChatMessage }) => {
    const pinnerName = item.pinned_by
      ? conversation?.participants?.find(
        (p) => String(p.user_id || p._id) === String(item.pinned_by),
      )?.display_name ||
      conversation?.participants?.find(
        (p) => String(p.user_id || p._id) === String(item.pinned_by),
      )?.name ||
      'Thành viên'
      : item.sender_name || 'Thành viên';

    const pinnedDate = formatMessageTimestampLabel(
      item.pinned_at || item.createdAt || item.created_at,
    );

    const previewText = getPinnedPreviewText(item);
    const senderName = item.sender_name || 'Thành viên';

    return (
      <Pressable
        onPress={() => {
          router.navigate({
            pathname: `/(main)/chat/[conversationId]`,
            params: { conversationId, highlightedMessageId: item.msg_id || item._id }
          });
        }}
        className="mx-4 mb-4 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Header: who pinned */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <View className="flex-row items-center gap-2 flex-1">
            {renderAvatar(pinnerName, '')}
            <View className="flex-1">
              <Text className="text-[14px] text-slate-800" numberOfLines={1}>
                <Text className="font-bold">{pinnerName}</Text>{' '}
                <Text className="text-slate-500">ghim một tin nhắn</Text>
              </Text>
              <Text className="text-[11px] text-slate-400">{pinnedDate}</Text>
            </View>
          </View>
          <Pressable className="p-1.5">
            <Feather name="more-horizontal" size={18} color="#94a3b8" />
          </Pressable>
        </View>

        {/* Message preview card */}
        <View className="mx-4 mb-4 mt-1 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <View className="flex-row items-start gap-2">
            <View
              className="mt-0.5 w-1 self-stretch rounded-full"
              style={{ backgroundColor: CHAT_BROWN_LIGHT }}
            />
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-slate-700 mb-0.5">
                {senderName}
              </Text>
              <Text className="text-[13px] text-slate-600" numberOfLines={3}>
                {previewText}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  // ─── Render poll item ───────────────────────────────────────────
  const renderPollItem = ({ item }: { item: ChatMessage }) => {
    const senderName = item.sender_name || 'Thành viên';
    const createdDate = formatMessageTimestampLabel(
      item.createdAt || item.created_at,
    );

    return (
      <View className="mx-4 mb-4 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <View className="flex-row items-center gap-2 flex-1">
            {renderAvatar(senderName, item.sender_avatar)}
            <View className="flex-1">
              <Text className="text-[14px] text-slate-800" numberOfLines={1}>
                <Text className="font-bold">{senderName}</Text>{' '}
                <Text className="text-slate-500">tạo một bình chọn</Text>
              </Text>
              <Text className="text-[11px] text-slate-400">{createdDate}</Text>
            </View>
          </View>
          <Pressable className="p-1.5">
            <Feather name="more-horizontal" size={18} color="#94a3b8" />
          </Pressable>
        </View>

        {/* Poll content */}
        <View className="px-2 pb-2">
          <ChatPollMessage
            message={item}
            isMine={String(item.sender_id) === String(userIdForChat)}
          />
        </View>
      </View>
    );
  };

  // ─── Empty states ───────────────────────────────────────────────
  const renderEmptyPinned = () => (
    <View className="flex-1 items-center justify-center px-10 py-20">
      <MaterialCommunityIcons name="pin-off-outline" size={80} color="#e2e8f0" />
      <Text className="mt-4 text-center text-[15px] text-slate-400">
        Chưa có tin nhắn nào được ghim
      </Text>
    </View>
  );

  const renderEmptyPoll = () => (
    <View className="flex-1 items-center justify-center px-10 py-20">
      <MaterialCommunityIcons
        name="clipboard-check-outline"
        size={80}
        color="#e2e8f0"
      />
      <Text className="mt-4 text-center text-[15px] text-slate-400 mb-8">
        Tạo bình chọn để giúp nhóm quyết định nhanh hơn
      </Text>
      <Pressable
        onPress={() => setPollModalVisible(true)}
        className="h-14 px-10 items-center justify-center rounded-full"
        style={{ backgroundColor: CHAT_BROWN }}
      >
        <Text className="text-[16px] font-bold text-white">Tạo bình chọn</Text>
      </Pressable>
    </View>
  );

  // ─── Tabs config ────────────────────────────────────────────────
  const tabs: { key: TabType; label: string }[] = [
    { key: 'pinned', label: 'Tin nhắn đã ghim' },
    { key: 'poll', label: 'Bình chọn' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#fcfcfc]" edges={['left', 'right']}>
      {/* ─── Header (gradient brown) ───────────────────────────── */}
      <LinearGradient
        colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 2,
          paddingBottom: 2,
          paddingTop: 50,
        }}
        className="px-4 pb-3"
      >
        <View className="flex-row items-center gap-3 px-4 py-1 justify-between">
          <Pressable
            onPress={() => {

              router.back();
            }}
            className="h-10 w-10  items-center justify-center"
          >
            <Feather
              name="chevron-left"
              size={24}
              color={THEME_COLORS.neutral.white}
            />
          </Pressable>

          <Text
            className="text-[18px] text-center font-bold text-white"
            numberOfLines={1}
          >
            Bảng tin nhóm
          </Text>

          <Pressable
            onPress={() => setPollModalVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full "
          >
            <Feather name="plus" size={22} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <View className="flex-row bg-white border-b border-slate-100">
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className="flex-1 items-center py-3.5"
            >
              <Text
                className={`text-[14px] font-semibold ${isActive ? 'text-[#b78457]' : 'text-slate-400'
                  }`}
              >
                {t.label}
              </Text>
              {isActive && (
                <View
                  className="absolute bottom-0 h-[3px] w-[60%] rounded-full"
                  style={{ backgroundColor: CHAT_BROWN }}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ─── Content ───────────────────────────────────────────── */}
      <View className="flex-1 pt-4">
        {tab === 'pinned' ? (
          <FlatList
            data={pinnedMessages}
            renderItem={renderPinnedItem}
            ListEmptyComponent={renderEmptyPinned}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyExtractor={(item) =>
              item.msg_id || item._id || String(Math.random())
            }
          />
        ) : (
          <FlatList
            data={pollMessages}
            renderItem={renderPollItem}
            ListEmptyComponent={renderEmptyPoll}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyExtractor={(item) =>
              item.msg_id || item._id || String(Math.random())
            }
          />
        )}
      </View>

      <CreatePollModal
        visible={pollModalVisible}
        onClose={() => setPollModalVisible(false)}
        onSubmit={handleCreatePoll}
      />
    </SafeAreaView>
  );
}
