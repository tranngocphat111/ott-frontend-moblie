import { THEME_COLORS } from '@/constants/theme';
import type { AccessControl, FriendOption } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { SOCIAL_COLORS } from './socialTheme';

export function FriendSelector({
  visible,
  friends,
  loading,
  selectedIds,
  ruleType,
  search,
  onRuleTypeChange,
  onSearchChange,
  onToggleFriend,
}: {
  visible: boolean;
  friends: FriendOption[];
  loading: boolean;
  selectedIds: string[];
  ruleType: AccessControl['ruleType'];
  search: string;
  onRuleTypeChange: (value: AccessControl['ruleType']) => void;
  onSearchChange: (value: string) => void;
  onToggleFriend: (friendId: string) => void;
}) {
  if (!visible) return null;

  const filtered = search.trim()
    ? friends.filter((friend) => friend.name.toLowerCase().includes(search.trim().toLowerCase()))
    : friends;

  return (
    <View
      className="mt-3 rounded-xl border p-3"
      style={{ backgroundColor: SOCIAL_COLORS.cardMuted, borderColor: SOCIAL_COLORS.border }}
    >
      <View className="flex-row rounded-full p-1" style={{ backgroundColor: SOCIAL_COLORS.card }}>
        {(['INCLUDE', 'EXCLUDE'] as const).map((type) => {
          const active = ruleType === type;
          return (
            <TouchableOpacity
              key={type}
              className="h-9 flex-1 items-center justify-center rounded-full"
              style={{ backgroundColor: active ? SOCIAL_COLORS.primaryDark : 'transparent' }}
              onPress={() => onRuleTypeChange(type)}
            >
              <Text className="text-xs font-bold" style={{ color: active ? '#fff' : SOCIAL_COLORS.textMuted }}>
                {type === 'INCLUDE' ? 'Chỉ những người này' : 'Trừ những người này'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder="Tìm bạn bè"
        placeholderTextColor={SOCIAL_COLORS.textSoft}
        className="mt-3 rounded-xl px-3 py-2.5 text-sm"
        style={{ backgroundColor: SOCIAL_COLORS.card, color: SOCIAL_COLORS.text }}
      />

      {loading ? (
        <View className="items-center py-5">
          <ActivityIndicator color={THEME_COLORS.primary[600]} />
        </View>
      ) : (
        <View className="mt-3 max-h-48">
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {filtered.map((friend) => {
              const selected = selectedIds.includes(friend.id);
              return (
                <TouchableOpacity
                  key={friend.id}
                  className="mb-2 flex-row items-center rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: SOCIAL_COLORS.card }}
                  activeOpacity={0.82}
                  onPress={() => onToggleFriend(friend.id)}
                >
                  <Avatar uri={friend.avatarUrl} name={friend.name} size={34} />
                  <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: SOCIAL_COLORS.text }} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: selected ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.card,
                      borderColor: selected ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.borderStrong,
                    }}
                  >
                    {selected ? <Feather name="check" size={14} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {!filtered.length && (
              <Text className="py-4 text-center text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
                Không tìm thấy bạn bè
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
