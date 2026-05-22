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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { THEME_COLORS } from '@/constants/theme';
import { MEDIA_CONFIG } from '@/configuration/api';
import { useAuth } from '@/contexts/Authcontext';

const getFullUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url;
  return `${MEDIA_CONFIG.BASE_URL}${url}`;
};

export interface CreateGroupUser {
  _id?: string;
  user_id: string;
  name?: string;
  avatar?: string;
  phone?: string;
  is_online?: boolean;
  last_active_at?: string;
}

type Tab = 'recent' | 'contacts';

interface CreateGroupModalProps {
  visible: boolean;
  users: CreateGroupUser[];
  loadingUsers?: boolean;
  preSelectedIds?: string[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[], avatarUri?: string) => void;
}

const getRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const getUserInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export function CreateGroupModal({
  visible,
  users,
  loadingUsers,
  preSelectedIds,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const insets = useSafeAreaInsets();
  const { chatUserId } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('recent');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStrangers, setSelectedStrangers] = useState<CreateGroupUser[]>([]);
  const [searchResultByPhone, setSearchResultByPhone] = useState<CreateGroupUser | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setGroupName('');
      setAvatarUri(undefined);
      setSearchText('');
      setSelectedIds(new Set(preSelectedIds || []));
      setSelectedStrangers([]);
      setTab('recent');
      setIsCreating(false);
    }
  }, [visible, preSelectedIds]);

  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('Image picker error:', error);
    }
  }, []);

  const handleToggleUser = useCallback((userId: string) => {
    // Don't allow deselecting pre-selected users
    if (preSelectedIds?.includes(userId)) return;

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

    // Handle stranger persistence outside the state updater
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
      // If deselecting, remove from selectedStrangers
      setSelectedStrangers((prevStrangers) =>
        prevStrangers.filter((s) => s.user_id !== userId),
      );
    }
  }, [preSelectedIds, searchResultByPhone, users, selectedIds]);

  const handleRemoveSelected = useCallback((userId: string) => {
    // Don't allow removing pre-selected users
    if (preSelectedIds?.includes(userId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    // Also remove from selectedStrangers
    setSelectedStrangers(prev => prev.filter(s => s.user_id !== userId));
  }, [preSelectedIds]);


  // Search by phone if keyword is exact phone number
  useEffect(() => {
    const keyword = searchText.trim();
    const isPhone = /^[0-9]{10,11}$/.test(keyword);

    if (isPhone) {
      // Check if already in friends list
      const inFriends = users.some(u => (u as any).phone === keyword);
      if (inFriends) {
        setSearchResultByPhone(null);
        return;
      }

      const timer = setTimeout(async () => {
        setIsSearchingPhone(true);
        try {
          const { ChatApi } = require('@/services/api');
          let user = await ChatApi.getUserByPhone(keyword);

          // Fallback: if not found and starts with 0, try with 84
          if (!user && keyword.startsWith('0')) {
            user = await ChatApi.getUserByPhone('84' + keyword.substring(1));
          }

          if (user && user.user_id !== chatUserId) {
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
  }, [searchText, users]);

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    // Start with friends
    let base = [...users];

    // Add ALL selected strangers so they remain visible in the list (if in contacts tab or if search cleared)
    selectedStrangers.forEach(stranger => {
      if (!base.some(u => u.user_id === stranger.user_id)) {
        base.push(stranger);
      }
    });

    // Add current search result if not already there
    if (searchResultByPhone && !base.some(u => u.user_id === searchResultByPhone.user_id)) {
      base.push(searchResultByPhone);
    }

    if (!keyword) return base;
    return base.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const phone = (u as any).phone || '';

      // Always include the explicit search result by phone
      if (searchResultByPhone && u.user_id === searchResultByPhone.user_id) return true;

      return name.includes(keyword) || phone.includes(keyword);
    });
  }, [users, searchText, searchResultByPhone]);

  const recentUsers = useMemo(() => {
    // Sort by last_active_at descending
    return [...filteredUsers].sort((a, b) => {
      const timeA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
      const timeB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredUsers]);

  const contactUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'vi'),
    );
  }, [filteredUsers]);

  const displayUsers = tab === 'recent' ? recentUsers : contactUsers;

  const selectedUsersList = useMemo(() => {
    // Include friends
    let base = [...users];

    // Include all selected strangers
    selectedStrangers.forEach(stranger => {
      if (!base.some(u => u.user_id === stranger.user_id)) {
        base.push(stranger);
      }
    });

    // Also include current search result in case user just clicked it
    if (searchResultByPhone && !base.some(u => u.user_id === searchResultByPhone.user_id)) {
      base.push(searchResultByPhone);
    }
    return base.filter((u) => selectedIds.has(u.user_id));
  }, [users, selectedIds, searchResultByPhone, selectedStrangers]);

  const handleCreate = useCallback(async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (selectedIds.size < 2) {
      Alert.alert('Lỗi', 'Cần chọn ít nhất 2 thành viên để tạo nhóm');
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(trimmedName, Array.from(selectedIds), avatarUri);
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setIsCreating(false);
    }
  }, [groupName, selectedIds, avatarUri, onCreate]);

  const canCreate = groupName.trim().length > 0 && selectedIds.size >= 2;

  const renderUserItem = useCallback(
    ({ item }: { item: CreateGroupUser }) => {
      const isSelected = selectedIds.has(item.user_id);
      return (
        <Pressable
          onPress={() => handleToggleUser(item.user_id)}
          style={styles.userItem}
        >
          {/* Checkbox */}
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && (
              <Feather name="check" size={14} color="#fff" />
            )}
          </View>

          {/* Avatar */}
          <View style={styles.userAvatarContainer}>
            {item.avatar ? (
              <Image
                source={{ uri: getFullUrl(item.avatar) }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                <Text style={styles.userAvatarInitials}>
                  {getUserInitials(item.name)}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name || item.user_id}
            </Text>
            {tab === 'recent' && item.last_active_at && (
              <Text style={styles.userSubtitle} numberOfLines={1}>
                {getRelativeTime(item.last_active_at)}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [selectedIds, handleToggleUser, tab],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={THEME_COLORS.primary[800]} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Nhóm mới</Text>
            {selectedIds.size > 0 && (
              <Text style={styles.headerSubtitle}>
                Đã chọn: {selectedIds.size}
              </Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Group name + avatar */}
        <View style={styles.groupInfoRow}>
          <Pressable onPress={handlePickAvatar} style={styles.avatarPicker}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri.startsWith('data:') || avatarUri.startsWith('file:') || avatarUri.startsWith('http') ? avatarUri : getFullUrl(avatarUri) }} style={styles.groupAvatar} />
            ) : (
              <View style={styles.groupAvatarPlaceholder}>
                <Feather
                  name="camera"
                  size={20}
                  color={THEME_COLORS.primary[500]}
                />
              </View>
            )}
          </Pressable>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Đặt tên nhóm"
            placeholderTextColor={THEME_COLORS.neutral.slate400}
            style={styles.groupNameInput}
            maxLength={50}
          />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Feather
            name="search"
            size={18}
            color={THEME_COLORS.neutral.slate400}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm tên hoặc số điện thoại"
            placeholderTextColor={THEME_COLORS.neutral.slate400}
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Feather
                name="x-circle"
                size={18}
                color={THEME_COLORS.neutral.slate400}
              />
            </Pressable>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab('recent')}
            style={[styles.tabButton, tab === 'recent' && styles.tabButtonActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'recent' && styles.tabTextActive,
              ]}
            >
              GẦN ĐÂY
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('contacts')}
            style={[styles.tabButton, tab === 'contacts' && styles.tabButtonActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'contacts' && styles.tabTextActive,
              ]}
            >
              DANH BẠ
            </Text>
          </Pressable>
        </View>

        {/* User list */}
        <View style={styles.listContainer}>
          {isSearchingPhone && (
            <View style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={THEME_COLORS.primary[500]} />
              <Text style={{ color: THEME_COLORS.neutral.slate500, fontSize: 13 }}>Đang tìm kiếm...</Text>
            </View>
          )}
          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={THEME_COLORS.primary[500]}
              />
              <Text style={styles.loadingText}>Đang tải danh sách...</Text>
            </View>
          ) : displayUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather
                name="users"
                size={40}
                color={THEME_COLORS.neutral.slate300}
              />
              <Text style={styles.emptyText}>
                {searchText.trim()
                  ? 'Không tìm thấy người dùng phù hợp'
                  : 'Không có người dùng nào'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayUsers}
              keyExtractor={(item) => item.user_id}
              renderItem={renderUserItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Selected users bar + Create button */}
        {selectedIds.size > 0 && (
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedChipsContainer}
              style={styles.selectedChipsScroll}
            >
              {selectedUsersList.map((user) => (
                <View key={user.user_id} style={styles.selectedChip}>
                  {user.avatar ? (
                    <Image
                      source={{ uri: getFullUrl(user.avatar) }}
                      style={styles.selectedChipAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.selectedChipAvatar,
                        styles.selectedChipAvatarPlaceholder,
                      ]}
                    >
                      <Text style={styles.selectedChipInitials}>
                        {getUserInitials(user.name)}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => handleRemoveSelected(user.user_id)}
                    style={styles.selectedChipRemove}
                  >
                    <Feather name="x" size={10} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={handleCreate}
              disabled={!canCreate || isCreating}
              style={[
                styles.createFab,
                (!canCreate || isCreating) && styles.createFabDisabled,
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="arrow-right" size={24} color="#fff" />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: THEME_COLORS.neutral.slate300,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.primary[800],
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME_COLORS.neutral.slate500,
    marginTop: 1,
  },
  groupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME_COLORS.neutral.slate300,
  },
  avatarPicker: {
    marginRight: 14,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  groupAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.primary[50],
    borderWidth: 1.5,
    borderColor: THEME_COLORS.primary[300],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNameInput: {
    flex: 1,
    fontSize: 16,
    color: THEME_COLORS.primary[900],
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.primary[200],
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME_COLORS.surface.sunken,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: THEME_COLORS.primary[900],
    paddingVertical: 0,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME_COLORS.neutral.slate300,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: THEME_COLORS.primary[600],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME_COLORS.neutral.slate500,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: THEME_COLORS.primary[700],
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: THEME_COLORS.neutral.slate500,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    color: THEME_COLORS.neutral.slate500,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME_COLORS.neutral.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: THEME_COLORS.primary[600],
    borderColor: THEME_COLORS.primary[600],
  },
  userAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  userAvatar: {
    width: 48,
    height: 48,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: THEME_COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.primary[600],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME_COLORS.primary[900],
  },
  userSubtitle: {
    fontSize: 13,
    color: THEME_COLORS.neutral.slate500,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: THEME_COLORS.neutral.slate300,
  },
  selectedChipsScroll: {
    flex: 1,
    maxHeight: 56,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  selectedChip: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  selectedChipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selectedChipAvatarPlaceholder: {
    backgroundColor: THEME_COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChipInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.primary[600],
  },
  selectedChipRemove: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME_COLORS.neutral.slate500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  createFab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME_COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: THEME_COLORS.primary[800],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  createFabDisabled: {
    backgroundColor: THEME_COLORS.neutral.slate300,
    shadowOpacity: 0,
    elevation: 0,
  },
});
