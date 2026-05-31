import { Avatar } from '@/components/social/SocialAvatar';
import { SOCIAL_COLORS, SOCIAL_SHADOW } from '@/components/social/socialTheme';
import { useAuth } from '@/contexts/Authcontext';
import { MediaApi, type FriendOption, type FriendRequestOption } from '@/services/api/media.api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type RelationshipTab = 'friends' | 'requests' | 'blocked';

export default function SocialRelationshipsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = user?.id;
  const [tab, setTab] = useState<RelationshipTab>('friends');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [requests, setRequests] = useState<FriendRequestOption[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextFriends, nextRequests, nextBlocked] = await Promise.all([
        MediaApi.fetchFriends(currentUserId),
        MediaApi.fetchPendingRequests(currentUserId),
        MediaApi.fetchBlockedUsers(currentUserId),
      ]);
      setFriends(nextFriends);
      setRequests(nextRequests);
      setBlocked(nextBlocked);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const openProfile = (userId?: string) => {
    if (!userId) return;
    router.push({
      pathname: '/(main)/social/profile/[userId]',
      params: { userId },
    });
  };

  const acceptRequest = async (request: FriendRequestOption) => {
    if (busyId) return;
    setBusyId(request.id);
    const previousRequests = requests;
    setRequests((prev) => prev.filter((item) => item.id !== request.id));
    try {
      const ok = await MediaApi.acceptFriendRequest(request.id);
      if (!ok) {
        setRequests(previousRequests);
        Alert.alert('Không thể đồng ý', 'Vui lòng thử lại sau.');
        return;
      }
      if (currentUserId) setFriends(await MediaApi.fetchFriends(currentUserId));
    } finally {
      setBusyId(null);
    }
  };

  const rejectRequest = async (request: FriendRequestOption) => {
    if (busyId) return;
    setBusyId(request.id);
    const previousRequests = requests;
    setRequests((prev) => prev.filter((item) => item.id !== request.id));
    try {
      const ok = await MediaApi.rejectFriendRequest(request.id);
      if (!ok) {
        setRequests(previousRequests);
        Alert.alert('Không thể từ chối', 'Vui lòng thử lại sau.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const unblockUser = async (user: any) => {
    if (busyId) return;
    setBusyId(user.id);
    const previousBlocked = blocked;
    setBlocked((prev) => prev.filter((item) => item.id !== user.id));
    try {
      const ok = await MediaApi.unblockRelationship(user.id);
      if (!ok) {
        setBlocked(previousBlocked);
        Alert.alert('Không thể bỏ chặn', 'Vui lòng thử lại sau.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <View className="px-4 pb-4" style={{ paddingTop: insets.top + 12, backgroundColor: SOCIAL_COLORS.page }}>
      <View className="rounded-2xl border p-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
      <View className="flex-row items-center">
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={SOCIAL_COLORS.primaryDark} />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="text-[22px] font-black" style={{ color: SOCIAL_COLORS.text }}>
            Bạn bè
          </Text>
          <Text className="mt-0.5 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
            Quản lý bạn bè và lời mời
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row rounded-full p-1" style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
        {([
          { value: 'friends', label: `Bạn bè ${friends.length}`, icon: 'people' },
          { value: 'requests', label: `Lời mời ${requests.length}`, icon: 'person-add' },
          { value: 'blocked', label: `Đã chặn ${blocked.length}`, icon: 'person-remove' },
        ] as { value: RelationshipTab; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map((item) => {
          const active = tab === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              className="h-10 flex-1 flex-row items-center justify-center rounded-full"
              style={{ backgroundColor: active ? SOCIAL_COLORS.primaryDark : 'transparent' }}
              onPress={() => setTab(item.value)}
            >
              <Ionicons name={item.icon} size={16} color={active ? '#fff' : SOCIAL_COLORS.primaryDark} />
              <Text className="ml-1.5 text-[13px] font-black" style={{ color: active ? '#fff' : SOCIAL_COLORS.textMuted }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </View>
    </View>
  );

  const data = tab === 'friends' ? friends : tab === 'requests' ? requests : blocked;

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right']} style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={SOCIAL_COLORS.primary} size="large" />
          <Text className="mt-3 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
            Đang tải...
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SOCIAL_COLORS.primary} />}
          ListEmptyComponent={
            <View className="mx-4 mt-8 items-center rounded-2xl border px-6 py-10" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
              <Feather name={tab === 'friends' ? 'users' : tab === 'requests' ? 'inbox' : 'user-x'} size={30} color={SOCIAL_COLORS.textSoft} />
              <Text className="mt-3 text-center text-base font-bold" style={{ color: SOCIAL_COLORS.text }}>
                {tab === 'friends' ? 'Chưa có bạn bè' : tab === 'requests' ? 'Không có lời mời mới' : 'Không có người bị chặn'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isRequest = tab === 'requests';
            const isBlocked = tab === 'blocked';
            const request = item as FriendRequestOption;
            const friend = item as FriendOption;
            const blockedUser = item as any;
            const targetId = isRequest ? request.userId : isBlocked ? blockedUser.receiverId : friend.id;
            const busy = (isRequest || isBlocked) && busyId === item.id;
            const itemName = isBlocked ? blockedUser.receiverDisplayName || blockedUser.receiverUsername || 'Người dùng' : item.name;
            const itemAvatar = isBlocked ? blockedUser.receiverAvatarUrl : item.avatarUrl;
            return (
              <TouchableOpacity
                className="mx-4 mb-3 rounded-2xl border p-3"
                style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border, ...SOCIAL_SHADOW }}
                activeOpacity={0.86}
                onPress={() => openProfile(targetId)}
              >
                <View className="flex-row items-center">
                  <Avatar uri={itemAvatar} name={itemName} size={52} color={SOCIAL_COLORS.primary} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[15px] font-black" style={{ color: SOCIAL_COLORS.text }} numberOfLines={1}>
                      {itemName}
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
                      {isRequest ? 'Đã gửi lời mời kết bạn' : isBlocked ? 'Bị chặn' : friend.phone || 'Bạn bè trên Riff'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={SOCIAL_COLORS.textSoft} />
                </View>

                {isRequest ? (
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      className="h-11 flex-1 flex-row items-center justify-center rounded-xl"
                      style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}
                      disabled={busy}
                      onPress={() => acceptRequest(request)}
                    >
                      {busy ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="check" size={17} color="#fff" />}
                      <Text className="ml-2 text-[13px] font-black text-white">Đồng ý</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="h-11 flex-1 flex-row items-center justify-center rounded-xl"
                      style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
                      disabled={busy}
                      onPress={() => rejectRequest(request)}
                    >
                      <Feather name="x" size={17} color={SOCIAL_COLORS.primaryDark} />
                      <Text className="ml-2 text-[13px] font-black" style={{ color: SOCIAL_COLORS.text }}>
                        Từ chối
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : isBlocked ? (
                  <View className="mt-3">
                    <TouchableOpacity
                      className="h-11 w-full flex-row items-center justify-center rounded-xl"
                      style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
                      disabled={busy}
                      onPress={() => unblockUser(blockedUser)}
                    >
                      {busy ? <ActivityIndicator color={SOCIAL_COLORS.primaryDark} size="small" /> : <Feather name="unlock" size={17} color={SOCIAL_COLORS.primaryDark} />}
                      <Text className="ml-2 text-[13px] font-black" style={{ color: SOCIAL_COLORS.text }}>
                        Bỏ chặn
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
