import type { StorySuggestedUser, StoryUserGroup } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { SOCIAL_COLORS, SOCIAL_SHADOW } from './socialTheme';

function StoryRail({
  storyGroups,
  suggestedUsers,
  currentUserName,
  currentUserAvatar,
  onOpenGroup,
  onCreateStory,
  onAddFriend,
}: {
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
  currentUserName?: string;
  currentUserAvatar?: string;
  onOpenGroup: (group: StoryUserGroup) => void;
  onCreateStory: () => void;
  onAddFriend: (user: StorySuggestedUser) => void;
}) {
  return (
    <View className="py-3" style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        <TouchableOpacity
          className="h-44 overflow-hidden rounded-[18px] border"
          style={{ width: 108, backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border, ...SOCIAL_SHADOW }}
          activeOpacity={0.86}
          onPress={onCreateStory}
        >
          <View className="h-[126px]" style={{ backgroundColor: SOCIAL_COLORS.chip }}>
            {currentUserAvatar ? (
              <ExpoImage source={{ uri: currentUserAvatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center" style={{ backgroundColor: SOCIAL_COLORS.chip }}>
                <Avatar uri={currentUserAvatar} name={currentUserName} size={46} />
              </View>
            )}
            <View className="absolute inset-0" style={{ backgroundColor: 'rgba(70,52,33,0.08)' }} />
          </View>
          <View className="h-[50px] items-center justify-end px-2 pb-2.5" style={{ backgroundColor: SOCIAL_COLORS.card }}>
            <Text className="text-center text-[12px] font-bold" style={{ color: SOCIAL_COLORS.text }} numberOfLines={2}>
              Tạo tin
            </Text>
          </View>
          <View className="absolute left-0 right-0 top-[112px] items-center">
            <View className="h-8 w-8 items-center justify-center rounded-full border-[3px] border-white" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
              <Feather name="plus" size={17} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {storyGroups.map((group) => {
          const firstStory = group.stories[0];
          const item = firstStory?.items?.[0];
          const preview =
            item?.type === 'IMAGE'
              ? item.url
              : firstStory?.imageUrl || (item?.type === 'VIDEO' ? firstStory.avatarUrl : undefined);
          const bg = item?.type === 'TEXT' ? item.textBackgroundColor || firstStory?.textBackgroundColor : '#111827';

          return (
            <TouchableOpacity
              key={group.userId}
              className="h-44 overflow-hidden rounded-[18px]"
              style={{ width: 108, backgroundColor: SOCIAL_COLORS.primaryDark, ...SOCIAL_SHADOW }}
              activeOpacity={0.86}
              onPress={() => onOpenGroup(group)}
            >
              {preview ? (
                <ExpoImage source={{ uri: preview }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center px-2" style={{ backgroundColor: bg || '#111827' }}>
                  {item?.type === 'TEXT' ? (
                    <Text className="text-center text-[16px] font-black leading-5 text-white" numberOfLines={4}>
                      {item.textContent || firstStory?.textContent || 'Tin'}
                    </Text>
                  ) : null}
                </View>
              )}
              <View className="absolute inset-0 bg-black/25" />
              <View className="absolute left-2 top-2 rounded-full border-[3px]" style={{ borderColor: SOCIAL_COLORS.primary }}>
                <Avatar uri={group.avatarUrl} name={group.name} size={34} />
              </View>
              <Text className="absolute bottom-2.5 left-2 right-2 text-[12px] font-bold leading-4 text-white" numberOfLines={2}>
                {group.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {suggestedUsers.map((user) => (
          <View
            key={user.id}
            className="h-44 rounded-[18px] border px-2 pb-2 pt-3"
            style={{ width: 116, backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border, ...SOCIAL_SHADOW }}
          >
            <View className="items-center">
              <View className="h-[68px] w-[68px] items-center justify-center rounded-full p-1" style={{ backgroundColor: SOCIAL_COLORS.chip }}>
                <Avatar uri={user.avatarUrl} name={user.name} size={60} color={SOCIAL_COLORS.primary} />
              </View>
            </View>
            <View className="mt-2 flex-1 justify-between">
              <View>
                <Text
                  className="text-center text-[12px] font-black leading-4"
                  style={{ color: SOCIAL_COLORS.text }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user.name}
                </Text>
                <Text className="mt-0.5 text-center text-[10px] font-semibold" style={{ color: SOCIAL_COLORS.textSoft }} numberOfLines={1}>
                  Gợi ý cho bạn
                </Text>
              </View>
              <TouchableOpacity
                className="h-8 flex-row items-center justify-center rounded-full"
                style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}
                activeOpacity={0.85}
                onPress={() => onAddFriend(user)}
              >
                <Feather name="user-plus" size={13} color="#fff" />
                <Text className="ml-1 text-[11px] font-black text-white">Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function CreatePostEntry({
  avatarUrl,
  name,
  onPress,
  onAvatarPress,
}: {
  avatarUrl?: string;
  name?: string;
  onPress: () => void;
  onAvatarPress?: () => void;
}) {
  return (
    <View className="mb-2 mt-1 border-y p-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
      <View className="flex-row items-center">
        <TouchableOpacity activeOpacity={0.85} onPress={onAvatarPress}>
          <Avatar uri={avatarUrl} name={name} size={42} />
        </TouchableOpacity>
        <TouchableOpacity
          className="ml-3 flex-1 rounded-full px-4 py-3"
          style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
          activeOpacity={0.8}
          onPress={onPress}
        >
          <Text className="text-[14px]" style={{ color: SOCIAL_COLORS.textMuted }}>Bạn đang nghĩ gì?</Text>
        </TouchableOpacity>
      </View>
      <View className="mt-3 flex-row border-t pt-3" style={{ borderColor: SOCIAL_COLORS.border }}>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center" onPress={onPress}>
          <Feather name="image" size={18} color={SOCIAL_COLORS.primary} />
          <Text className="ml-2 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Ảnh/video</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center" onPress={onPress}>
          <Feather name="edit-3" size={17} color={SOCIAL_COLORS.primaryDark} />
          <Text className="ml-2 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Bài viết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function DiscoverHeader({
  userName,
  avatarUrl,
  storyGroups,
  suggestedUsers,
  topInset = 0,
  onCreatePost,
  onCreateStory,
  onOpenStory,
  onAddFriend,
  onOpenCurrentProfile,
}: {
  userName?: string;
  avatarUrl?: string;
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
  topInset?: number;
  onCreatePost: () => void;
  onCreateStory: () => void;
  onOpenStory: (group: StoryUserGroup) => void;
  onAddFriend: (user: StorySuggestedUser) => void;
  onOpenCurrentProfile?: () => void;
}) {
  return (
    <View style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <View
        className="mb-2 border-b px-4 pb-4"
        style={{ paddingTop: topInset + 12, backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[25px] font-black" style={{ color: SOCIAL_COLORS.text }}>Khám phá</Text>
            <Text className="mt-0.5 text-sm" style={{ color: SOCIAL_COLORS.textMuted }}>Bảng tin, story và media</Text>
          </View>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }} onPress={onCreatePost}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <StoryRail
        storyGroups={storyGroups}
        suggestedUsers={suggestedUsers}
        currentUserName={userName}
        currentUserAvatar={avatarUrl}
        onOpenGroup={onOpenStory}
        onCreateStory={onCreateStory}
        onAddFriend={onAddFriend}
      />
      <CreatePostEntry
        avatarUrl={avatarUrl}
        name={userName}
        onPress={onCreatePost}
        onAvatarPress={onOpenCurrentProfile}
      />
    </View>
  );
}
