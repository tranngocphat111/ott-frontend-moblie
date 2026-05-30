import type {
  StorySuggestedUser,
  StoryUserGroup,
} from "@/services/api/media.api";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Avatar } from "./SocialAvatar";
import { SOCIAL_COLORS, SOCIAL_SHADOW } from "./socialTheme";

function StoryRail({
  storyGroups,
  suggestedUsers,
  currentUserName,
  currentUserAvatar,
  loadError,
  onOpenGroup,
  onCreateStory,
  onAddFriend,
  onCancelFriend,
  pendingMap,
  hiddenIds,
}: {
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
  currentUserName?: string;
  currentUserAvatar?: string;
  loadError?: string | null;
  onOpenGroup: (group: StoryUserGroup) => void;
  onCreateStory: () => void;
  onAddFriend: (user: StorySuggestedUser) => void;
  onCancelFriend?: (userId: string) => void;
  pendingMap?: Record<string, string>;
  hiddenIds?: Set<string>;
}) {
  const isEmpty = storyGroups.length === 0;

  return (
    <View className="pb-3" style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity
          className="h-44 overflow-hidden rounded-[18px] border"
          style={{
            width: 108,
            backgroundColor: SOCIAL_COLORS.card,
            borderColor: SOCIAL_COLORS.border,
            ...SOCIAL_SHADOW,
          }}
          activeOpacity={0.86}
          onPress={onCreateStory}>
          <View
            className="h-[126px]"
            style={{ backgroundColor: SOCIAL_COLORS.chip }}>
            {currentUserAvatar ? (
              <ExpoImage
                source={{ uri: currentUserAvatar }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Avatar name={currentUserName} size={46} />
              </View>
            )}
          </View>
          <View
            className="h-[50px] items-center justify-end px-2 pb-2.5"
            style={{ backgroundColor: SOCIAL_COLORS.card }}>
            <Text
              className="text-center text-[12px] font-bold"
              style={{ color: SOCIAL_COLORS.text }}
              numberOfLines={2}>
              Tạo tin
            </Text>
          </View>
          <View className="absolute left-0 right-0 top-[112px] items-center">
            <View
              className="h-8 w-8 items-center justify-center rounded-full border-[3px] border-white"
              style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
              <Feather name="plus" size={17} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {storyGroups.map((group) => {
          const firstStory = group.stories[0];
          const item = firstStory?.items?.[0];
          const preview =
            item?.type === "IMAGE" ?
              item.url
            : firstStory?.imageUrl ||
              (item?.type === "VIDEO" ? firstStory.avatarUrl : undefined);
          const bg =
            item?.type === "TEXT" ?
              item.textBackgroundColor || firstStory?.textBackgroundColor
            : "#111827";

          return (
            <TouchableOpacity
              key={group.userId}
              className="h-44 overflow-hidden rounded-[18px]"
              style={{
                width: 108,
                backgroundColor: SOCIAL_COLORS.primaryDark,
                ...SOCIAL_SHADOW,
              }}
              activeOpacity={0.86}
              onPress={() => onOpenGroup(group)}>
              {preview ?
                <ExpoImage
                  source={{ uri: preview }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              : <View
                  className="h-full w-full items-center justify-center px-2"
                  style={{ backgroundColor: bg || "#111827" }}>
                  {item?.type === "TEXT" ?
                    <Text
                      className="text-center text-[16px] font-black leading-5 text-white"
                      numberOfLines={4}>
                      {item.textContent || firstStory?.textContent || "Tin"}
                    </Text>
                  : null}
                </View>
              }
              <View className="absolute inset-0 bg-black/25" />
              <View
                className="absolute left-2 top-2 rounded-full border-[3px]"
                style={{ borderColor: SOCIAL_COLORS.primary }}>
                <Avatar uri={group.avatarUrl} name={group.name} size={34} />
              </View>
              <Text
                className="absolute bottom-2.5 left-2 right-2 text-[12px] font-bold leading-4 text-white"
                numberOfLines={2}>
                {group.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {loadError ?
          <View
            className="h-44 w-[224px] justify-center rounded-[18px] border px-4"
            style={{
              backgroundColor: SOCIAL_COLORS.card,
              borderColor: SOCIAL_COLORS.border,
              ...SOCIAL_SHADOW,
            }}>
            <Text
              className="text-[13px] font-black"
              style={{ color: SOCIAL_COLORS.text }}>
              Không tải được story
            </Text>
            <Text
              className="mt-1 text-[12px] leading-4"
              style={{ color: SOCIAL_COLORS.textMuted }}>
              {loadError}
            </Text>
          </View>
        : isEmpty ?
          <View
            className="h-44 w-[224px] justify-center rounded-[18px] border px-4"
            style={{
              backgroundColor: SOCIAL_COLORS.card,
              borderColor: SOCIAL_COLORS.border,
              ...SOCIAL_SHADOW,
            }}>
            <Text
              className="text-[13px] font-black"
              style={{ color: SOCIAL_COLORS.text }}>
              Chưa có story
            </Text>
            <Text
              className="mt-1 text-[12px] leading-4"
              style={{ color: SOCIAL_COLORS.textMuted }}>
              Story mới sẽ xuất hiện ở đây.
            </Text>
          </View>
        : null}

        {suggestedUsers
          .filter((user) => !hiddenIds?.has(user.id))
          .map((user) => {
            const isPending = !!pendingMap?.[user.id];
            return (
              <TouchableOpacity
                key={user.id}
                className="h-44 overflow-hidden rounded-[18px] border"
                style={{
                  width: 108,
                  backgroundColor: SOCIAL_COLORS.card,
                  borderColor: SOCIAL_COLORS.border,
                  ...SOCIAL_SHADOW,
                }}
                activeOpacity={0.86}>
                <View className="h-[68%] overflow-hidden bg-gray-100">
                  {user.avatarUrl ?
                    <ExpoImage
                      source={{ uri: user.avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  : <View
                      className="h-full w-full items-center justify-center"
                      style={{ backgroundColor: SOCIAL_COLORS.chip }}>
                      <Avatar name={user.name} size={46} />
                    </View>
                  }
                </View>
                <View
                  className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-1.5"
                  style={{ backgroundColor: SOCIAL_COLORS.card }}>
                  <Text
                    className="text-center text-[11px] font-black leading-4"
                    style={{ color: SOCIAL_COLORS.text }}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {user.name}
                  </Text>
                  <TouchableOpacity
                    className="mt-1 h-6 flex-row items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        isPending ?
                          SOCIAL_COLORS.chip
                        : SOCIAL_COLORS.primaryDark,
                    }}
                    activeOpacity={0.85}
                    onPress={() =>
                      isPending ? onCancelFriend?.(user.id) : onAddFriend(user)
                    }>
                    <Text
                      className="text-[10px] font-bold"
                      style={{
                        color: isPending ? SOCIAL_COLORS.textSoft : "#fff",
                      }}>
                      {isPending ? "Đã gửi" : "Thêm bạn"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </View>
  );
}

function CreatePostEntry({
  avatarUrl,
  name,
  onPress,
  onFeelingPress,
  onAvatarPress,
}: {
  avatarUrl?: string;
  name?: string;
  onPress: () => void;
  onFeelingPress?: () => void;
  onAvatarPress?: () => void;
}) {
  const lastName = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .pop();

  return (
    <View
      className="mx-4 mb-3 mt-3 rounded-2xl border p-3"
      style={{
        backgroundColor: SOCIAL_COLORS.card,
        borderColor: SOCIAL_COLORS.border,
        ...SOCIAL_SHADOW,
      }}>
      <View className="mb-3 flex-row items-center">
        <TouchableOpacity activeOpacity={0.85} onPress={onAvatarPress}>
          <Avatar uri={avatarUrl} name={name} size={42} />
        </TouchableOpacity>
        <TouchableOpacity
          className="ml-3 flex-1 rounded-full px-4 py-3"
          style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
          activeOpacity={0.8}
          onPress={onPress}>
          <Text
            className="text-[14px]"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            {lastName ?
              `${lastName} ơi, bạn đang nghĩ gì vậy?`
            : "Bạn đang nghĩ gì vậy?"}
          </Text>
        </TouchableOpacity>
      </View>
      <View
        className="flex-row border-t pt-2"
        style={{ borderColor: SOCIAL_COLORS.border }}>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center rounded-xl py-2"
          onPress={onPress}>
          <Feather name="video" size={18} color={SOCIAL_COLORS.primary} />
          <Text
            className="ml-2 text-sm font-semibold"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            Live
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center rounded-xl py-2"
          onPress={onPress}>
          <Feather name="image" size={18} color={SOCIAL_COLORS.primary} />
          <Text
            className="ml-2 text-sm font-semibold"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            Ảnh/video
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center rounded-xl py-2"
          onPress={onFeelingPress || onPress}>
          <Feather name="smile" size={18} color={SOCIAL_COLORS.primary} />
          <Text
            className="ml-2 text-sm font-semibold"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            Cảm xúc
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HeaderAction({
  icon,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  primary?: boolean;
}) {
  if (!onPress) return null;
  return (
    <TouchableOpacity
      className="h-9 w-9 items-center justify-center rounded-full"
      style={{
        backgroundColor:
          primary ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip,
      }}
      activeOpacity={0.85}
      onPress={onPress}>
      <Feather
        name={icon}
        size={primary ? 20 : 17}
        color={primary ? "#fff" : SOCIAL_COLORS.primaryDark}
      />
    </TouchableOpacity>
  );
}

export function DiscoverHeader({
  userName,
  avatarUrl,
  storyGroups,
  suggestedUsers,
  topInset = 0,
  storyLoadError = null,
  onCreatePost,
  onCreatePostWithFeeling,
  onCreateStory,
  onOpenStory,
  onAddFriend,
  onOpenCurrentProfile,
  onOpenSearch,
  onOpenSaved,
  onOpenHistory,
  onOpenRelationships,
  onCancelFriend,
  pendingMap,
  hiddenIds,
}: {
  userName?: string;
  avatarUrl?: string;
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
  topInset?: number;
  storyLoadError?: string | null;
  onCreatePost: () => void;
  onCreatePostWithFeeling?: () => void;
  onCreateStory: () => void;
  onOpenStory: (group: StoryUserGroup) => void;
  onAddFriend: (user: StorySuggestedUser) => void;
  onCancelFriend?: (userId: string) => void;
  pendingMap?: Record<string, string>;
  hiddenIds?: Set<string>;
  onOpenCurrentProfile?: () => void;
  onOpenSearch?: () => void;
  onOpenSaved?: () => void;
  onOpenHistory?: () => void;
  onOpenRelationships?: () => void;
}) {
  return (
    <View style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <View
        className="border-b px-4 pb-3"
        style={{
          paddingTop: topInset + 8,
          backgroundColor: SOCIAL_COLORS.page,
          borderColor: SOCIAL_COLORS.border,
        }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="text-[24px] font-black"
              style={{ color: SOCIAL_COLORS.text }}>
              Social
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <HeaderAction icon="search" onPress={onOpenSearch} />
            <HeaderAction icon="bookmark" onPress={onOpenSaved} />
            <HeaderAction icon="clock" onPress={onOpenHistory} />
            <HeaderAction icon="users" onPress={onOpenRelationships} />
            <HeaderAction icon="plus" onPress={onCreatePost} primary />
          </View>
        </View>
      </View>
      <CreatePostEntry
        avatarUrl={avatarUrl}
        name={userName}
        onPress={onCreatePost}
        onFeelingPress={onCreatePostWithFeeling}
        onAvatarPress={onOpenCurrentProfile}
      />
      <StoryRail
        storyGroups={storyGroups}
        suggestedUsers={suggestedUsers}
        currentUserName={userName}
        currentUserAvatar={avatarUrl}
        loadError={storyLoadError}
        onOpenGroup={onOpenStory}
        onCreateStory={onCreateStory}
        onAddFriend={onAddFriend}
        onCancelFriend={onCancelFriend}
        pendingMap={pendingMap}
        hiddenIds={hiddenIds}
      />
    </View>
  );
}
