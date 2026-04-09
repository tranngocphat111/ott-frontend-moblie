import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/Authcontext';
import { ChatApi } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';
import { getConversationAvatar, getConversationTitle, resolveMediaUrl } from '@/utils/chat';
import {
  useConversationInfo,
  useMemberManagement,
  useConversationSettings,
  useNicknameEditor,
} from '@/hooks/chat';

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

  const userIdForChat = chatUserId || user?.id;

  // Hooks
  const { loading, conversation, participant, members, allUsers, categories, pinnedMessages, mediaMessages, fileMessages, linkMessages, loadInfo } = useConversationInfo(conversationId, userIdForChat);
  const { nicknameModalVisible, setNicknameModalVisible, nicknameInput, setNicknameInput, openNicknameEditor, submitNickname } = useNicknameEditor({
    conversationId,
    userIdForChat,
    onLoadInfo: loadInfo,
  });

  // Derived state
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === 'group';
  const myMember = useMemo(
    () => members.find((member) => String(member.user_id || '') === String(userIdForChat || '')),
    [members, userIdForChat],
  );
  const isAdmin = String(myMember?.roles || '') === 'admin';
  const memberIds = useMemo(() => new Set(members.map((member) => String(member.user_id || ''))), [members]);
  const addableUsers = useMemo(
    () => allUsers.filter((candidate) => !memberIds.has(String(candidate.user_id || ''))),
    [allUsers, memberIds],
  );

  // Member management  
  const handleMemberPress = useCallback(
    (member: any) => {
      const memberUserId = String(member?.user_id || '');
      const isSelf = memberUserId === String(userIdForChat || '');

      const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
        {
          text: 'Đổi biệt danh',
          onPress: () => {
            const currentName = member?.nickname || member?.user?.name || member?.name || '';
            openNicknameEditor(memberUserId, currentName);
          },
        },
      ];

      if (isAdmin && !isSelf) {
        const nextRole = member?.roles === 'admin' ? 'user' : 'admin';
        options.push({
          text: nextRole === 'admin' ? 'Đặt làm quản trị viên' : 'Gỡ quyền quản trị viên',
          onPress: async () => {
            if (!conversationId || !userIdForChat) return;
            try {
              await ChatApi.updateMemberRole(conversationId, memberUserId, userIdForChat, nextRole);
              await loadInfo();
            } catch {
              Alert.alert('Lỗi', 'Không thể cập nhật vai trò');
            }
          },
        });
        options.push({
          text: 'Xóa khỏi nhóm',
          style: 'destructive',
          onPress: async () => {
            if (!conversationId || !userIdForChat) return;
            try {
              await ChatApi.removeMember(conversationId, memberUserId, userIdForChat);
              await loadInfo();
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa thành viên');
            }
          },
        });
      }

      options.push({ text: 'Hủy', style: 'cancel' });
      Alert.alert('Tùy chọn thành viên', '', options);
    },
    [conversationId, userIdForChat, isAdmin, loadInfo, openNicknameEditor],
  );

  const handleAddMember = useCallback(
    async (newMemberId: string) => {
      if (!conversationId || !userIdForChat) return;
      try {
        await ChatApi.addMembers(conversationId, userIdForChat, [newMemberId]);
        await loadInfo();
        setMemberModalVisible(false);
      } catch {
        Alert.alert('Lỗi', 'Không thể thêm thành viên');
      }
    },
    [conversationId, userIdForChat, loadInfo],
  );

  // Settings
  const handleTogglePinConversation = useCallback(async () => {
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
  }, [conversationId, userIdForChat, participant, loadInfo]);

  const handleSelectCategory = useCallback(async (categoryId?: string | null) => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updateConversationCategory(conversationId, userIdForChat, categoryId ?? null);
      await loadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật phân loại hội thoại');
    }
  }, [conversationId, userIdForChat, loadInfo]);

  const handleDeleteConversation = useCallback(() => {
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
  }, [conversationId, userIdForChat, router]);

  const handleChangeNotificationStatus = useCallback(async (status: 'on' | 'mute' | 'off') => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updateNotificationStatus(conversationId, userIdForChat, status, null);
      await loadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái thông báo');
    }
  }, [conversationId, userIdForChat, loadInfo]);

  const handleLeaveGroup = useCallback(async () => {
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
  }, [conversationId, userIdForChat, isGroup, router]);

  // Local UI state
  const [tab, setTab] = useState<InfoTab>('members');
  const [memberModalVisible, setMemberModalVisible] = useState(false);

  // Setup focus
  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

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
      <LinearGradient colors={['#1d84f2', '#1ca6e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="px-4 pb-3 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 rounded-full bg-white/20 items-center justify-center">
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>

          <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
            {avatar ? <Image source={{ uri: avatar }} className="h-full w-full" /> : null}
          </View>

          <View className="flex-1">
            <Text className="text-[20px] font-bold text-white" numberOfLines={1}>{title}</Text>
            <Text className="text-[12px] text-white/85">
              {isGroup ? `${members.length} thành viên` : 'Hội thoại riêng'}
            </Text>
          </View>
        </View>
      </LinearGradient>

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

          {isGroup && isAdmin && (
            <Pressable onPress={() => setMemberModalVisible(true)} className="rounded-xl bg-blue-100 px-3 py-2">
              <Text className="text-[12px] font-semibold text-blue-700">Thêm thành viên</Text>
            </Pressable>
          )}
        </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => handleChangeNotificationStatus('on')}
            className={`rounded-full px-3 py-2 ${participant?.settings?.notification_status === 'on' ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
          >
            <Text className={`text-[12px] font-semibold ${participant?.settings?.notification_status === 'on' ? 'text-white' : 'text-slate-700'}`}>
              Báo đầy đủ
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChangeNotificationStatus('mute')}
            className={`rounded-full px-3 py-2 ${participant?.settings?.notification_status === 'mute' ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
          >
            <Text className={`text-[12px] font-semibold ${participant?.settings?.notification_status === 'mute' ? 'text-white' : 'text-slate-700'}`}>
              Tắt tạm thời
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChangeNotificationStatus('off')}
            className={`rounded-full px-3 py-2 ${participant?.settings?.notification_status === 'off' ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
          >
            <Text className={`text-[12px] font-semibold ${participant?.settings?.notification_status === 'off' ? 'text-white' : 'text-slate-700'}`}>
              Tắt hẳn
            </Text>
          </Pressable>
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
                <Pressable onPress={() => handleMemberPress(item)} className="mb-2 flex-row items-center rounded-2xl bg-white px-3 py-3 border border-slate-200">
                  <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                    {avatarUrl ? <Image source={{ uri: avatarUrl }} className="h-full w-full" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">{name}</Text>
                    <Text className="text-[12px] text-slate-500">{item?.roles === 'admin' ? 'Quản trị viên' : 'Thành viên'}</Text>
                  </View>
                  <Feather name="more-horizontal" size={16} color="#64748b" />
                </Pressable>
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

      <Modal visible={memberModalVisible} transparent animationType="slide" onRequestClose={() => setMemberModalVisible(false)}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setMemberModalVisible(false)}>
          <Pressable className="max-h-[70%] rounded-t-[24px] bg-white px-4 pb-5 pt-4" onPress={() => undefined}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-slate-900">Thêm thành viên</Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-slate-100" onPress={() => setMemberModalVisible(false)}>
                <Feather name="x" size={16} color="#334155" />
              </Pressable>
            </View>

            <FlatList
              data={addableUsers}
              keyExtractor={(item) => item._id || item.user_id}
              ListEmptyComponent={<Text className="py-6 text-center text-[13px] text-slate-500">Không còn user để thêm</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => void handleAddMember(item.user_id)} className="mb-2 flex-row items-center rounded-2xl border border-slate-200 px-3 py-3">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    {item.avatar ? <Image source={{ uri: item.avatar }} className="h-full w-full rounded-full" /> : <Feather name="user" size={16} color="#64748b" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">{item.name || item.user_id}</Text>
                    <Text className="text-[12px] text-slate-500">{item.user_id}</Text>
                  </View>
                  <Feather name="plus-circle" size={18} color="#1d84f2" />
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={nicknameModalVisible} transparent animationType="fade" onRequestClose={() => setNicknameModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-5" onPress={() => setNicknameModalVisible(false)}>
          <Pressable className="w-full rounded-2xl bg-white p-4" onPress={() => undefined}>
            <Text className="text-[16px] font-bold text-slate-900">Đổi biệt danh</Text>
            <TextInput
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="Nhập biệt danh"
              className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable onPress={() => setNicknameModalVisible(false)} className="rounded-xl bg-slate-100 px-4 py-2.5">
                <Text className="text-[13px] font-semibold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable onPress={() => void submitNickname()} className="rounded-xl bg-[#1d84f2] px-4 py-2.5">
                <Text className="text-[13px] font-semibold text-white">Lưu</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [mediaMessages, setMediaMessages] = useState<ChatMessage[]>([]);
  const [fileMessages, setFileMessages] = useState<ChatMessage[]>([]);
  const [linkMessages, setLinkMessages] = useState<ChatLinkMessage[]>([]);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameTargetId, setNicknameTargetId] = useState<string | null>(null);

  const userIdForChat = chatUserId || user?.id;
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === 'group';
  const myMember = useMemo(
    () => members.find((member) => String(member.user_id || '') === String(userIdForChat || '')),
    [members, userIdForChat],
  );
  const isAdmin = String(myMember?.roles || '') === 'admin';
  const memberIds = useMemo(() => new Set(members.map((member) => String(member.user_id || ''))), [members]);
  const addableUsers = useMemo(
    () => allUsers.filter((candidate) => !memberIds.has(String(candidate.user_id || ''))),
    [allUsers, memberIds],
  );

  const loadInfo = useCallback(async () => {
    if (!conversationId || !userIdForChat) return;

    setLoading(true);
    try {
      const [conversations, membersData, pinnedData, mediaData, filesData, linksData, categoriesData, usersData] = await Promise.all([
        ChatApi.getUserConversations(userIdForChat),
        ChatApi.getConversationMembers(conversationId),
        ChatApi.getPinnedMessages(conversationId).catch(() => []),
        ChatApi.getMediaMessages(conversationId).catch(() => []),
        ChatApi.getFileMessages(conversationId).catch(() => []),
        ChatApi.getLinkMessages(conversationId).catch(() => []),
        ChatApi.getUserCategories(userIdForChat).catch(() => []),
        ChatApi.getAllUsers().catch(() => []),
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

  const handleChangeNotificationStatus = async (status: 'on' | 'mute' | 'off') => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updateNotificationStatus(conversationId, userIdForChat, status, null);
      await loadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái thông báo');
    }
  };

  const openNicknameEditor = (memberUserId: string, currentName?: string) => {
    setNicknameTargetId(memberUserId);
    setNicknameInput(currentName || '');
    setNicknameModalVisible(true);
  };

  const submitNickname = async () => {
    if (!conversationId || !userIdForChat || !nicknameTargetId) return;
    try {
      await ChatApi.updateMemberNickname(
        conversationId,
        nicknameTargetId,
        userIdForChat,
        nicknameInput.trim(),
      );
      setNicknameModalVisible(false);
      setNicknameTargetId(null);
      setNicknameInput('');
      await loadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật biệt danh');
    }
  };

  const handleMemberPress = (member: any) => {
    const memberUserId = String(member?.user_id || '');
    const isSelf = memberUserId === String(userIdForChat || '');

    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: 'Đổi biệt danh',
        onPress: () =>
          openNicknameEditor(memberUserId, member?.nickname || member?.user?.name || member?.name || ''),
      },
    ];

    if (isAdmin && !isSelf) {
      const nextRole = member?.roles === 'admin' ? 'user' : 'admin';
      options.push({
        text: nextRole === 'admin' ? 'Đặt làm quản trị viên' : 'Gỡ quyền quản trị viên',
        onPress: async () => {
          if (!conversationId || !userIdForChat) return;
          try {
            await ChatApi.updateMemberRole(conversationId, memberUserId, userIdForChat, nextRole);
            await loadInfo();
          } catch {
            Alert.alert('Lỗi', 'Không thể cập nhật vai trò');
          }
        },
      });
      options.push({
        text: 'Xóa khỏi nhóm',
        style: 'destructive',
        onPress: async () => {
          if (!conversationId || !userIdForChat) return;
          try {
            await ChatApi.removeMember(conversationId, memberUserId, userIdForChat);
            await loadInfo();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa thành viên');
          }
        },
      });
    }

    options.push({ text: 'Hủy', style: 'cancel' });
    Alert.alert('Tùy chọn thành viên', '', options);
  };

  const handleAddMember = async (newMemberId: string) => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.addMembers(conversationId, userIdForChat, [newMemberId]);
      await loadInfo();
      setMemberModalVisible(false);
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm thành viên');
    }
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
      <LinearGradient colors={['#1d84f2', '#1ca6e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="px-4 pb-3 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 rounded-full bg-white/20 items-center justify-center">
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>

          <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
            {avatar ? <Image source={{ uri: avatar }} className="h-full w-full" /> : null}
          </View>

          <View className="flex-1">
            <Text className="text-[20px] font-bold text-white" numberOfLines={1}>{title}</Text>
            <Text className="text-[12px] text-white/85">
              {isGroup ? `${members.length} thành viên` : 'Hội thoại riêng'}
            </Text>
          </View>
        </View>
      </LinearGradient>

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

          {isGroup && isAdmin && (
            <Pressable onPress={() => setMemberModalVisible(true)} className="rounded-xl bg-blue-100 px-3 py-2">
              <Text className="text-[12px] font-semibold text-blue-700">Thêm thành viên</Text>
            </Pressable>
          )}
        </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => handleChangeNotificationStatus('on')}
            className={`rounded-full px-3 py-2 ${participant?.settings?.notification_status === 'on' ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
          >
            <Text className={`text-[12px] font-semibold ${participant?.settings?.notification_status === 'on' ? 'text-white' : 'text-slate-700'}`}>
              Báo đầy đủ
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChangeNotificationStatus('mute')}
            className={`rounded-full px-3 py-2 ${participant?.settings?.notification_status === 'mute' ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
          >
            <Text className={`text-[12px] font-semibold ${participant?.settings?.notification_status === 'mute' ? 'text-white' : 'text-slate-700'}`}>
              Tắt tạm thời
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChangeNotificationStatus('off')}
            className={`rounded-full px-3 py-2 ${participant?.settings?.notification_status === 'off' ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
          >
            <Text className={`text-[12px] font-semibold ${participant?.settings?.notification_status === 'off' ? 'text-white' : 'text-slate-700'}`}>
              Tắt hẳn
            </Text>
          </Pressable>
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
                <Pressable onPress={() => handleMemberPress(item)} className="mb-2 flex-row items-center rounded-2xl bg-white px-3 py-3 border border-slate-200">
                  <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                    {avatarUrl ? <Image source={{ uri: avatarUrl }} className="h-full w-full" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">{name}</Text>
                    <Text className="text-[12px] text-slate-500">{item?.roles === 'admin' ? 'Quản trị viên' : 'Thành viên'}</Text>
                  </View>
                  <Feather name="more-horizontal" size={16} color="#64748b" />
                </Pressable>
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

      <Modal visible={memberModalVisible} transparent animationType="slide" onRequestClose={() => setMemberModalVisible(false)}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setMemberModalVisible(false)}>
          <Pressable className="max-h-[70%] rounded-t-[24px] bg-white px-4 pb-5 pt-4" onPress={() => undefined}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-slate-900">Thêm thành viên</Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-slate-100" onPress={() => setMemberModalVisible(false)}>
                <Feather name="x" size={16} color="#334155" />
              </Pressable>
            </View>

            <FlatList
              data={addableUsers}
              keyExtractor={(item) => item._id || item.user_id}
              ListEmptyComponent={<Text className="py-6 text-center text-[13px] text-slate-500">Không còn user để thêm</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => void handleAddMember(item.user_id)} className="mb-2 flex-row items-center rounded-2xl border border-slate-200 px-3 py-3">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    {item.avatar ? <Image source={{ uri: item.avatar }} className="h-full w-full rounded-full" /> : <Feather name="user" size={16} color="#64748b" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">{item.name || item.user_id}</Text>
                    <Text className="text-[12px] text-slate-500">{item.user_id}</Text>
                  </View>
                  <Feather name="plus-circle" size={18} color="#1d84f2" />
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={nicknameModalVisible} transparent animationType="fade" onRequestClose={() => setNicknameModalVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-5" onPress={() => setNicknameModalVisible(false)}>
          <Pressable className="w-full rounded-2xl bg-white p-4" onPress={() => undefined}>
            <Text className="text-[16px] font-bold text-slate-900">Đổi biệt danh</Text>
            <TextInput
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="Nhập biệt danh"
              className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable onPress={() => setNicknameModalVisible(false)} className="rounded-xl bg-slate-100 px-4 py-2.5">
                <Text className="text-[13px] font-semibold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable onPress={() => void submitNickname()} className="rounded-xl bg-[#1d84f2] px-4 py-2.5">
                <Text className="text-[13px] font-semibold text-white">Lưu</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
