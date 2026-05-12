import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '@/constants/theme';
import { MEDIA_CONFIG } from '@/configuration/api';
import { useAuth } from '@/contexts/Authcontext';

import { resolveMediaUrl } from '@/utils/chat';

const getFullUrl = (url?: string) => {
  return resolveMediaUrl(url);
};

export interface AddMemberUser {
  _id?: string;
  user_id: string;
  name?: string;
  avatar?: string;
  phone?: string;
  is_online?: boolean;
  last_active_at?: string;
}

interface AddMemberModalProps {
  visible: boolean;
  conversationId: string;
  currentMembers: { user_id: string }[];
  users: AddMemberUser[];
  onClose: () => void;
  onMembersAdded: (newMembers: any[]) => void;
}

const getUserInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export function AddMemberModal({
  visible,
  conversationId,
  currentMembers,
  users,
  onClose,
  onMembersAdded,
}: AddMemberModalProps) {
  const insets = useSafeAreaInsets();
  const { chatUserId } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStrangers, setSelectedStrangers] = useState<AddMemberUser[]>([]);
  const [searchResultByPhone, setSearchResultByPhone] = useState<AddMemberUser | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  useEffect(() => {
    if (visible) {
      setSearchText('');
      setSelectedIds(new Set());
      setSelectedStrangers([]);
      setIsSubmitting(false);
      setSearchResultByPhone(null);
    }
  }, [visible]);

  const handleToggleUser = useCallback((userId: string) => {
    const isSelecting = !selectedIds.has(userId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (next.size >= 100) {
          Alert.alert('Giới hạn', 'Chỉ có thể chọn tối đa 100 thành viên');
          return prev;
        }
        next.add(userId);
      }
      return next;
    });

    if (isSelecting) {
      if (searchResultByPhone && searchResultByPhone.user_id === userId) {
        const isFriend = users.some((u) => u.user_id === userId);
        if (!isFriend) {
          setSelectedStrangers((prevStrangers) => {
            if (!prevStrangers.some((s) => s.user_id === userId)) {
              return [...prevStrangers, searchResultByPhone];
            }
            return prevStrangers;
          });
        }
      }
    } else {
      setSelectedStrangers((prevStrangers) =>
        prevStrangers.filter((s) => s.user_id !== userId),
      );
    }
  }, [selectedIds, searchResultByPhone, users]);

  useEffect(() => {
    const keyword = searchText.trim();
    const isPhone = /^[0-9]{10,11}$/.test(keyword);

    if (isPhone) {
      const alreadyMember = currentMembers.some(m => (m as any).phone === keyword || m.user_id === keyword);
      if (alreadyMember) {
        setSearchResultByPhone(null);
        return;
      }

      const timer = setTimeout(async () => {
        setIsSearchingPhone(true);
        try {
          const { ChatApi } = require('@/services/api');
          let user = await ChatApi.getUserByPhone(keyword);
          if (!user && keyword.startsWith('0')) {
            user = await ChatApi.getUserByPhone('84' + keyword.substring(1));
          }
          if (user && user.user_id !== chatUserId) {
            const isMember = currentMembers.some(m => m.user_id === user.user_id);
            if (!isMember) {
              setSearchResultByPhone({
                user_id: user.user_id,
                name: user.name,
                avatar: user.avatar,
                phone: keyword,
                _id: user._id,
              });
            } else {
              setSearchResultByPhone(null);
            }
          } else {
            setSearchResultByPhone(null);
          }
        } catch (error) {
          console.error('Phone search failed:', error);
          setSearchResultByPhone(null);
        } finally {
          setIsSearchingPhone(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResultByPhone(null);
    }
  }, [searchText, currentMembers, chatUserId]);

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const currentMemberIds = new Set(currentMembers.map(m => m.user_id));
    let base = users.filter(u => !currentMemberIds.has(u.user_id));
    selectedStrangers.forEach(stranger => {
      if (!base.some(u => u.user_id === stranger.user_id)) {
        base.push(stranger);
      }
    });
    if (searchResultByPhone && !base.some(u => u.user_id === searchResultByPhone.user_id)) {
      base.push(searchResultByPhone);
    }
    if (!keyword) return base;
    return base.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const phone = (u as any).phone || '';
      if (searchResultByPhone && u.user_id === searchResultByPhone.user_id) return true;
      return name.includes(keyword) || phone.includes(keyword);
    });
  }, [users, currentMembers, searchText, searchResultByPhone, selectedStrangers]);

  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) return;

    // Ensure we have a valid requester ID
    const requesterId = chatUserId;
    if (!requesterId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { ChatApi } = require('@/services/api');

      // Phân loại: bạn bè và người lạ
      const friendIds: string[] = [];
      const strangerUsers: AddMemberUser[] = [];

      selectedIds.forEach((id) => {
        const isFriend = users.some((u) => u.user_id === id);
        if (isFriend) {
          friendIds.push(id);
        } else {
          const stranger = selectedStrangers.find((s) => s.user_id === id) || (searchResultByPhone?.user_id === id ? searchResultByPhone : null);
          if (stranger) strangerUsers.push(stranger);
        }
      });

      // 1. Thêm bạn bè vào nhóm trực tiếp như cũ
      if (friendIds.length > 0) {
        const result = await ChatApi.addMembers(
          conversationId,
          requesterId,
          friendIds,
        );
        onMembersAdded(result.members || []);
      }

      // 2. Gửi link mời cho người lạ
      if (strangerUsers.length > 0) {
        // Lấy link mời của nhóm
        const inviteLink = await ChatApi.getInviteLink(conversationId, requesterId);

        for (const stranger of strangerUsers) {
          // Tạo/Lấy hội thoại 1-1 với người lạ
          const privateConv = await ChatApi.createConversation({
            creatorId: requesterId,
            type: 'private',
            memberIds: [stranger.user_id],
          });

          // Gửi tin nhắn chứa link mời
          await ChatApi.sendMessage({
            conversationId: privateConv._id || privateConv.conversation?._id,
            senderId: requesterId,
            content: inviteLink,
            type: 'link'
          });
        }
        Alert.alert('Thành công', `Đã gửi link mời tham gia nhóm cho ${strangerUsers.length} người lạ.`);
      }

      onClose();
    } catch (error) {
      console.error('Add members error:', error);
      Alert.alert('Lỗi', 'Không thể hoàn thành yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }, [conversationId, selectedIds, chatUserId, onMembersAdded, onClose]);

  const renderUserItem = useCallback(
    ({ item }: { item: AddMemberUser }) => {
      const isSelected = selectedIds.has(item.user_id);
      const isFriend = users.some(u => u.user_id === item.user_id);
      const isMe = item.user_id === chatUserId;
      return (
        <Pressable
          className="flex-row items-center px-5 py-4"
          onPress={() => handleToggleUser(item.user_id)}
        >
          <View className="relative">
            {item.avatar ? (
              <Image
                source={{ uri: getFullUrl(item.avatar) }}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-slate-200 items-center justify-center">
                <Text className="text-xl font-semibold text-slate-600">{getUserInitials(item.name)}</Text>
              </View>
            )}
          </View>
          <View className="flex-1 ml-4">
            <View className="flex-row items-center">
              <Text className="text-[17px] font-semibold text-slate-900" numberOfLines={1}>
                {item.name}
              </Text>

            </View>
            {item.phone && !isFriend && (
              <Text className="text-[14px] text-slate-500 mt-1">{item.phone}</Text>
            )}
          </View>

          {!isMe && !isFriend && (
            <Pressable
              onPress={() => {
                Alert.alert("Thông báo", "Tính năng kết bạn đang được cập nhật");
              }}
              className="mr-3 rounded-full bg-primary-50 px-3 py-1.5 border border-primary-100"
            >
              <Text className="text-[12px] font-bold text-primary-600">Kết bạn</Text>
            </Pressable>
          )}
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
              }`}
          >
            {isSelected && <Feather name="check" size={14} color="#FFF" />}
          </View>
        </Pressable>
      );
    },
    [selectedIds, handleToggleUser, users],
  );

  const renderSeparator = useCallback(() => (
    <View className="h-[1px] bg-slate-100 ml-20" />
  ), []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-black/40"
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 h-16 border-b border-slate-100">
            <Pressable onPress={onClose} className="w-10 h-10 items-center justify-center">
              <Feather name="chevron-left" size={28} color="#1e293b" />
            </Pressable>
            <Text className="flex-1 text-[19px] font-bold text-slate-900 text-center">Thêm thành viên</Text>
            <Pressable
              onPress={handleSubmit}
              disabled={selectedIds.size === 0 || isSubmitting}
              className={`w-14 h-10 items-center justify-center ${selectedIds.size === 0 ? 'opacity-50' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text className={`text-[17px] font-bold ${selectedIds.size > 0 ? 'text-primary-600' : 'text-slate-400'}`}>
                  Xong
                </Text>
              )}
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="p-4">
            <View className="flex-row items-center bg-slate-100 rounded-2xl px-4 h-12">
              <Feather name="search" size={22} color="#94a3b8" />
              <TextInput
                className="flex-1 text-[16px] text-slate-900 ml-3"
                placeholder="Tìm tên hoặc số điện thoại"
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#94a3b8"
                autoFocus={false}
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')}>
                  <Feather name="x-circle" size={20} color="#94a3b8" />
                </Pressable>
              )}
            </View>
          </View>

          {/* User List */}
          {isSearchingPhone ? (
            <View className="flex-1 items-center justify-center p-5">
              <ActivityIndicator color="#8b5cf6" size="large" />
              <Text className="mt-4 text-[15px] text-slate-500">Đang tìm kiếm...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="flex-1 items-center justify-center p-10">
              <View className="w-24 h-24 bg-slate-50 rounded-full items-center justify-center mb-4">
                <Feather name="users" size={40} color="#cbd5e1" />
              </View>
              <Text className="text-lg font-semibold text-slate-900">Không tìm thấy kết quả</Text>
              <Text className="text-[15px] text-slate-500 text-center mt-2">
                Thử tìm theo số điện thoại để tìm người lạ
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              ItemSeparatorComponent={renderSeparator}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
