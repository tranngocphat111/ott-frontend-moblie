import type { StoryItem } from '@/services/api/media.api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { SOCIAL_COLORS, SOCIAL_SHADOW, visibilityLabel } from './socialTheme';

export function SocialStoryCard({
  story,
  saved,
  busy,
  actionLabel,
  onOpen,
  onOpenProfile,
  onToggleSave,
}: {
  story: StoryItem;
  saved?: boolean;
  busy?: boolean;
  actionLabel?: string;
  onOpen: (story: StoryItem) => void;
  onOpenProfile?: (story: StoryItem) => void;
  onToggleSave?: (story: StoryItem) => void;
}) {
  const primary = story.items?.find((item) => item.type === 'IMAGE' || item.type === 'VIDEO' || item.type === 'TEXT');
  const kind = primary?.type || story.contentType || 'UNKNOWN';
  const imageUri = kind === 'IMAGE' ? primary?.url || story.imageUrl : story.imageUrl;
  const textContent = kind === 'TEXT' ? primary?.textContent || story.textContent : story.textContent;
  const background = kind === 'TEXT' ? primary?.textBackgroundColor || story.textBackgroundColor : '#111827';

  return (
    <Pressable
      className="mx-4 mb-3 overflow-hidden rounded-2xl border"
      style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border, ...SOCIAL_SHADOW }}
      onPress={() => onOpen(story)}
    >
      <View className="flex-row">
        <View className="h-36 w-28 overflow-hidden" style={{ backgroundColor: background || SOCIAL_COLORS.primaryDark }}>
          {imageUri ? (
            <ExpoImage source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : kind === 'VIDEO' ? (
            <View className="h-full w-full items-center justify-center bg-slate-950">
              <Feather name="play" size={26} color="#fff" />
            </View>
          ) : (
            <View className="h-full w-full items-center justify-center px-2">
              <Text className="text-center text-[15px] font-black leading-5 text-white" numberOfLines={4}>
                {textContent || 'Tin'}
              </Text>
            </View>
          )}
          {kind === 'VIDEO' ? (
            <View className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50">
              <Feather name="play" size={15} color="#fff" />
            </View>
          ) : null}
        </View>

        <View className="flex-1 p-3">
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.85} onPress={() => onOpenProfile?.(story)}>
            <Avatar uri={story.avatarUrl} name={story.name} size={36} />
            <View className="ml-2 flex-1">
              <Text className="text-[14px] font-black" style={{ color: SOCIAL_COLORS.text }} numberOfLines={1}>
                {story.name}
              </Text>
              <Text className="text-[11px] font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
                {visibilityLabel(story.visibility)}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="mt-auto flex-row items-center gap-2">
            <View className="h-9 flex-1 flex-row items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
              <Feather name="maximize-2" size={15} color={SOCIAL_COLORS.primaryDark} />
              <Text className="ml-1.5 text-[12px] font-black" style={{ color: SOCIAL_COLORS.text }}>
                Mở tin
              </Text>
            </View>
            {onToggleSave ? (
              <TouchableOpacity
                className="h-9 min-w-[92px] flex-row items-center justify-center rounded-full"
                style={{ backgroundColor: saved ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip }}
                disabled={busy}
                onPress={() => onToggleSave(story)}
              >
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={15} color={saved ? '#fff' : SOCIAL_COLORS.primaryDark} />
                <Text className="ml-1.5 text-[12px] font-black" style={{ color: saved ? '#fff' : SOCIAL_COLORS.text }}>
                  {actionLabel || (saved ? 'Đã lưu' : 'Lưu')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
