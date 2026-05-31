import { MediaApi, type AccessControl, type FriendOption, type Post, type Visibility } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { Avatar } from './SocialAvatar';
import { FriendSelector } from './FriendSelector';
import { VisibilityPills } from './VisibilityPills';
import { buildCaptionWithFeeling, draftFromPickerAsset, draftFromPostMedia, FEELING_OPTIONS, type DraftMediaItem, type FeelingOption, SOCIAL_COLORS, useFullScreenModalPadding } from './socialTheme';
import MentionInput, { SuggestionsDropdown } from '../common/MentionInput';

export function CreatePostModal({
  visible,
  userId,
  avatarUrl,
  userName,
  initialPost,
  openWithFeeling = false,
  onClose,
  onCreated,
  onUpdated,
}: {
  visible: boolean;
  userId?: string;
  avatarUrl?: string;
  userName?: string;
  initialPost?: Post | null;
  openWithFeeling?: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
  onUpdated?: (post: Post) => void;
}) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [media, setMedia] = useState<DraftMediaItem[]>([]);
  const [feeling, setFeeling] = useState<FeelingOption | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customRuleType, setCustomRuleType] = useState<AccessControl['ruleType']>('INCLUDE');
  const [mentionKeyword, setMentionKeyword] = useState<string | undefined>();
  const [mentionOnPress, setMentionOnPress] = useState<any>();
  const [submitting, setSubmitting] = useState(false);
  const modalPadding = useFullScreenModalPadding();
  const isEditing = Boolean(initialPost);

  useEffect(() => {
    if (!visible) return;
    setCaption(initialPost?.content || '');
    setVisibility((initialPost?.visibility?.toUpperCase() as Visibility) || 'PUBLIC');
    setMedia((initialPost?.media || []).map(draftFromPostMedia));
    setFeeling(null);
    setShowFeelings(!initialPost && openWithFeeling);
    setFriendSearch('');
    const initialAccess = initialPost?.accessControls || [];
    setSelectedFriendIds(initialAccess.map((item) => item.accountId));
    setCustomRuleType(initialAccess[0]?.ruleType || 'INCLUDE');
  }, [initialPost, openWithFeeling, visible]);

  useEffect(() => {
    if (!visible || visibility !== 'CUSTOM' || !userId || friends.length > 0) return;
    setFriendsLoading(true);
    MediaApi.fetchFriends(userId)
      .then(setFriends)
      .finally(() => setFriendsLoading(false));
  }, [friends.length, userId, visibility, visible]);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.86,
    });

    if (result.canceled) return;
    setMedia((prev) => [...prev, ...result.assets.map(draftFromPickerAsset)].slice(0, 20));
  };

  const removeMedia = (draftId: string) => {
    setMedia((prev) => prev.filter((item) => item.draftId !== draftId));
  };

  const updateMediaCaption = (draftId: string, nextCaption: string) => {
    setMedia((prev) => prev.map((item) => (item.draftId === draftId ? { ...item, caption: nextCaption } : item)));
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const accessControls: AccessControl[] | undefined =
    visibility === 'CUSTOM'
      ? selectedFriendIds.map((accountId) => ({ accountId, ruleType: customRuleType }))
      : undefined;

  const canSubmit =
    Boolean(userId) &&
    (caption.trim().length > 0 || media.length > 0 || feeling !== null) &&
    (visibility !== 'CUSTOM' || selectedFriendIds.length > 0) &&
    !submitting;

  const submit = async () => {
    if (!userId || !canSubmit) return;
    setSubmitting(true);
    try {
      const finalCaption = buildCaptionWithFeeling(caption, feeling);
      const result = initialPost
        ? await MediaApi.updatePost(initialPost.id, userId, finalCaption, visibility, media, accessControls)
        : await MediaApi.createPost(
            userId,
            finalCaption,
            visibility,
            media.filter((item) => item.file).map((item) => item.file!),
            media.filter((item) => item.file).map((item) => item.caption ?? ''),
            accessControls,
          );
      if (!result.post) {
        Alert.alert(isEditing ? 'Không cập nhật được' : 'Không đăng được', result.error || 'Vui lòng thử lại sau.');
        return;
      }
      if (initialPost) onUpdated?.(result.post);
      else onCreated(result.post);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1" style={[modalPadding, { backgroundColor: SOCIAL_COLORS.page }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="h-14 flex-row items-center justify-between border-b px-4" style={{ borderColor: SOCIAL_COLORS.border }}>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={onClose}>
              <Feather name="x" size={21} color={SOCIAL_COLORS.primaryDark} />
            </TouchableOpacity>
            <Text className="text-lg font-bold" style={{ color: SOCIAL_COLORS.text }}>{isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</Text>
            <TouchableOpacity
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: canSubmit ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip }}
              disabled={!canSubmit}
              onPress={submit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-bold" style={{ color: canSubmit ? '#fff' : SOCIAL_COLORS.textSoft }}>
                  {isEditing ? 'Lưu' : 'Đăng'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4">
              <View className="flex-row items-center">
                <Avatar uri={avatarUrl} name={userName} />
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold" style={{ color: SOCIAL_COLORS.text }}>{userName || 'Người dùng'}</Text>
                  {feeling ? (
                    <TouchableOpacity className="mt-1 flex-row items-center" onPress={() => setFeeling(null)}>
                      <Text className="text-xs font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
                        đang cảm thấy {feeling.emoji} {feeling.label}
                      </Text>
                      <Feather name="x" size={12} color={SOCIAL_COLORS.textSoft} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View className="mt-4">
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
              </View>

              {mentionKeyword != null && mentionOnPress != null && (
                <View style={{ marginBottom: 4 }}>
                  <SuggestionsDropdown keyword={mentionKeyword} onSuggestionPress={mentionOnPress} />
                </View>
              )}
              <MentionInput
                value={caption}
                onChangeText={setCaption}
                onMentionStateChange={(k, p) => { setMentionKeyword(k); setMentionOnPress(() => p); }}
                multiline
                placeholder="Bạn đang nghĩ gì?"
                placeholderTextColor={SOCIAL_COLORS.textSoft}
                className="mt-5 min-h-[116px] text-[18px] leading-7"
                style={{ color: SOCIAL_COLORS.text }}
                textAlignVertical="top"
              />

              {showFeelings && (
                <View className="mb-2 flex-row flex-wrap gap-2">
                  {FEELING_OPTIONS.map((item) => {
                    const active = feeling?.label === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        className="rounded-full border px-3 py-2"
                        style={{
                          backgroundColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chipLight,
                          borderColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.border,
                        }}
                        onPress={() => {
                          setFeeling(active ? null : item);
                          setShowFeelings(false);
                        }}
                      >
                        <Text className="text-xs font-bold" style={{ color: active ? '#fff' : SOCIAL_COLORS.textMuted }}>
                          {item.emoji} {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {media.length > 0 && (
                <View className="mt-3">
                  {media.map((item) => (
                    <View key={item.draftId} className="mb-3 overflow-hidden rounded-xl border" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
                      <View className="h-52" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
                        {item.type === 'video' ? (
                          <View className="h-full w-full items-center justify-center">
                            <Feather name="video" size={28} color="#fff" />
                            <Text className="mt-2 text-xs font-bold text-white/80">Video</Text>
                          </View>
                        ) : (
                          <ExpoImage source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        )}
                        <TouchableOpacity
                          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/55"
                          onPress={() => removeMedia(item.draftId)}
                        >
                          <Feather name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        value={item.caption || ''}
                        onChangeText={(value) => updateMediaCaption(item.draftId, value)}
                        placeholder="Thêm chú thích cho media"
                        placeholderTextColor={SOCIAL_COLORS.textSoft}
                        className="px-3 py-3 text-sm"
                        style={{ color: SOCIAL_COLORS.text }}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View className="border-t px-4 py-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="h-12 flex-1 flex-row items-center justify-center rounded-xl"
                style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
                onPress={pickMedia}
              >
                <Feather name="image" size={19} color={SOCIAL_COLORS.primary} />
                <Text className="ml-2 font-bold" style={{ color: SOCIAL_COLORS.textMuted }}>Ảnh/video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 flex-1 flex-row items-center justify-center rounded-xl"
                style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
                onPress={() => setShowFeelings((value) => !value)}
              >
                <Text className="text-[18px]">😊</Text>
                <Text className="ml-2 font-bold" style={{ color: SOCIAL_COLORS.textMuted }}>Cảm xúc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
