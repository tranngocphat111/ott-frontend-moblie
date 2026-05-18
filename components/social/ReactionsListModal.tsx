import { THEME_COLORS } from '@/constants/theme';
import { MediaApi, type ApiReaction, type Post } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { reactionMeta, REACTION_OPTIONS, SOCIAL_COLORS, useFullScreenModalPadding } from './socialTheme';

export function ReactionsListModal({
  visible,
  post,
  onClose,
}: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
}) {
  const [reactions, setReactions] = useState<ApiReaction[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const modalPadding = useFullScreenModalPadding();

  useEffect(() => {
    if (!visible || !post) return;
    setActiveTab('ALL');
    setLoading(true);
    MediaApi.fetchPostReactionDetails(post.id)
      .then(setReactions)
      .finally(() => setLoading(false));
  }, [post, visible]);

  const counts = reactions.reduce<Record<string, number>>((acc, reaction) => {
    const key = String(reaction.reactionType || 'LIKE').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filtered =
    activeTab === 'ALL'
      ? reactions
      : reactions.filter((reaction) => String(reaction.reactionType || '').toUpperCase() === activeTab);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1" style={[modalPadding, { backgroundColor: SOCIAL_COLORS.page }]}>
        <View className="h-14 flex-row items-center justify-between border-b px-4" style={{ borderColor: SOCIAL_COLORS.border }}>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: SOCIAL_COLORS.chip }}
            onPress={onClose}
          >
            <Feather name="x" size={21} color={SOCIAL_COLORS.primaryDark} />
          </TouchableOpacity>
          <Text className="text-[17px] font-black" style={{ color: SOCIAL_COLORS.text }}>Cảm xúc</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="border-b px-4 py-3" style={{ borderColor: SOCIAL_COLORS.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              className="h-9 flex-row items-center rounded-full px-4"
              style={{ backgroundColor: activeTab === 'ALL' ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip }}
              onPress={() => setActiveTab('ALL')}
            >
              <Text className="text-sm font-bold" style={{ color: activeTab === 'ALL' ? '#fff' : SOCIAL_COLORS.textMuted }}>
                Tất cả {reactions.length}
              </Text>
            </TouchableOpacity>
            {REACTION_OPTIONS.filter((item) => counts[item.value] > 0).map((item) => {
              const active = activeTab === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  className="h-9 flex-row items-center rounded-full px-3"
                  style={{ backgroundColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip }}
                  onPress={() => setActiveTab(item.value)}
                >
                  <Text className="text-base">{item.emoji}</Text>
                  <Text className="ml-1 text-sm font-bold" style={{ color: active ? '#fff' : SOCIAL_COLORS.textMuted }}>
                    {counts[item.value]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={THEME_COLORS.primary[600]} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => item.id || `${item.accountId}-${index}`}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Text className="text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Chưa có cảm xúc nào</Text>
              </View>
            }
            renderItem={({ item }) => {
              const meta = reactionMeta(item.reactionType);
              const name = item.accountDisplayName || item.accountUsername || 'Người dùng';
              return (
                <View className="mb-3 flex-row items-center rounded-xl px-3 py-3" style={{ backgroundColor: SOCIAL_COLORS.card }}>
                  <View>
                    <Avatar uri={item.accountAvatarUrl} name={name} size={42} />
                    <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.card }}>
                      <Text className="text-[15px]">{meta.emoji}</Text>
                    </View>
                  </View>
                  <Text className="ml-3 flex-1 text-sm font-bold" style={{ color: SOCIAL_COLORS.text }} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-xs font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>{meta.label}</Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
