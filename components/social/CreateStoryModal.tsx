import { MediaApi, type AccessControl, type FriendOption, type Visibility } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FriendSelector } from './FriendSelector';
import { VisibilityPills } from './VisibilityPills';
import { draftFromPickerAsset, SOCIAL_COLORS, STORY_BACKGROUNDS, type DraftMediaItem, useFullScreenModalPadding } from './socialTheme';

export function CreateStoryModal({
  visible,
  userId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  userId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [text, setText] = useState('');
  const [background, setBackground] = useState(STORY_BACKGROUNDS[0]);
  const [media, setMedia] = useState<DraftMediaItem | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('FRIENDS');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customRuleType, setCustomRuleType] = useState<AccessControl['ruleType']>('INCLUDE');
  const [submitting, setSubmitting] = useState(false);
  const modalPadding = useFullScreenModalPadding();

  useEffect(() => {
    if (!visible) return;
    setText('');
    setBackground(STORY_BACKGROUNDS[0]);
    setMedia(null);
    setVisibility('FRIENDS');
    setFriendSearch('');
    setSelectedFriendIds([]);
  }, [visible]);

  useEffect(() => {
    if (!visible || visibility !== 'CUSTOM' || !userId || friends.length > 0) return;
    setFriendsLoading(true);
    MediaApi.fetchFriends(userId)
      .then(setFriends)
      .finally(() => setFriendsLoading(false));
  }, [friends.length, userId, visibility, visible]);

  const pickStoryMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    setMedia(draftFromPickerAsset(result.assets[0]));
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const submit = async () => {
    if (!userId || submitting) return;
    if (!text.trim() && !media) return;
    if (visibility === 'CUSTOM' && selectedFriendIds.length === 0) return;
    setSubmitting(true);
    try {
      let uploadedKey: string | undefined;
      if (media?.file) {
        const uploaded = await MediaApi.uploadStoryMedia(media.file);
        if (!uploaded?.fileKey) {
          Alert.alert('Không tải được media', 'Vui lòng thử lại sau.');
          return;
        }
        uploadedKey = uploaded.fileKey;
      }

      const accessControls =
        visibility === 'CUSTOM'
          ? selectedFriendIds.map((accountId) => ({ accountId, ruleType: customRuleType }))
          : undefined;

      const storyItems = media
        ? [
            {
              type: media.type === 'video' ? 'VIDEO_ITEM' : 'IMAGE_ITEM',
              imageItem:
                media.type === 'image'
                  ? {
                      url: uploadedKey || media.url,
                      width: 1080,
                      height: 1920,
                    }
                  : null,
              videoItem:
                media.type === 'video'
                  ? {
                      url: uploadedKey || media.url,
                      width: 1080,
                      height: 1920,
                    }
                  : null,
              textItem: null,
              isPrimary: true,
              zIndex: 1,
              positionX: 0.5,
              positionY: 0.5,
              rotation: 0,
              scale: 1,
            },
            ...(text.trim()
              ? [
                  {
                    type: 'TEXT_ITEM',
                    imageItem: null,
                    videoItem: null,
                    textItem: {
                      content: text.trim(),
                      color: '#ffffff',
                      backgroundColor: 'transparent',
                      alignment: 'CENTER',
                    },
                    isPrimary: false,
                    zIndex: 2,
                    positionX: 0.5,
                    positionY: 0.75,
                    rotation: 0,
                    scale: 1,
                  },
                ]
              : []),
          ]
        : [
            {
              type: 'TEXT_ITEM',
              textItem: {
                content: text.trim(),
                color: '#ffffff',
                backgroundColor: background,
                alignment: 'CENTER',
              },
              isPrimary: true,
              zIndex: 1,
              positionX: 0.5,
              positionY: 0.5,
              rotation: 0,
              scale: 1,
            },
          ];

      const story = await MediaApi.createStory({
        userId,
        visibility,
        accessControls,
        isHighlight: false,
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        storyItems,
      });

      if (!story) {
        Alert.alert('Không tạo được tin', 'Vui lòng thử lại sau.');
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1" style={[modalPadding, { backgroundColor: SOCIAL_COLORS.page }]}>
        <View className="h-14 flex-row items-center justify-between border-b px-4" style={{ borderColor: SOCIAL_COLORS.border }}>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={onClose}>
            <Feather name="x" size={21} color={SOCIAL_COLORS.primaryDark} />
          </TouchableOpacity>
          <Text className="text-lg font-bold" style={{ color: SOCIAL_COLORS.text }}>Tạo tin</Text>
          {(() => {
            const canShare =
              Boolean(text.trim() || media) &&
              (visibility !== 'CUSTOM' || selectedFriendIds.length > 0) &&
              !submitting;
            return (
          <TouchableOpacity
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: canShare ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip }}
            disabled={!canShare}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="font-bold" style={{ color: canShare ? '#fff' : SOCIAL_COLORS.textSoft }}>Đăng</Text>
            )}
          </TouchableOpacity>
            );
          })()}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <VisibilityPills value={visibility} onChange={setVisibility} />
          <FriendSelector
            visible={visibility === 'CUSTOM'}
            friends={friends}
            loading={friendsLoading}
            selectedIds={selectedFriendIds}
            ruleType={customRuleType}
            search={friendSearch}
            onRuleTypeChange={setCustomRuleType}
            onSearchChange={setFriendSearch}
            onToggleFriend={toggleFriend}
          />
          {visibility === 'CUSTOM' && selectedFriendIds.length === 0 ? (
            <Text className="mt-2 text-xs font-semibold text-red-500">Chọn ít nhất một người cho phạm vi tùy chỉnh.</Text>
          ) : null}

          <View
            className="mt-4 h-[520px] overflow-hidden rounded-[20px] border"
            style={{ backgroundColor: media ? SOCIAL_COLORS.primaryDark : background, borderColor: SOCIAL_COLORS.border }}
          >
            {media ? (
              media.type === 'video' ? (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="video" size={36} color="#fff" />
                  <Text className="mt-3 text-sm font-bold text-white/80">Video story</Text>
                </View>
              ) : (
                <ExpoImage source={{ uri: media.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              )
            ) : null}
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder={media ? 'Thêm chữ lên tin' : 'Viết tin của bạn'}
              placeholderTextColor="rgba(255,255,255,0.65)"
              className={`absolute inset-x-0 ${media ? 'bottom-16 min-h-[80px]' : 'top-0 h-full'} px-8 text-center text-[27px] font-black leading-10 text-white`}
              textAlignVertical="center"
            />
            {media ? (
              <TouchableOpacity
                className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/55"
                onPress={() => setMedia(null)}
              >
                <Feather name="x" size={18} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-4 flex-row justify-center gap-3">
            {STORY_BACKGROUNDS.map((color) => (
              <TouchableOpacity
                key={color}
                className="h-10 w-10 rounded-full border-2"
                style={{ backgroundColor: color, borderColor: background === color ? SOCIAL_COLORS.primaryDark : '#fff' }}
                onPress={() => setBackground(color)}
              />
            ))}
          </View>

          <TouchableOpacity
            className="mt-4 h-12 flex-row items-center justify-center rounded-xl"
            style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
            onPress={pickStoryMedia}
          >
            <Feather name="image" size={19} color={SOCIAL_COLORS.primary} />
            <Text className="ml-2 font-bold" style={{ color: SOCIAL_COLORS.textMuted }}>{media ? 'Đổi ảnh/video' : 'Thêm ảnh/video'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
