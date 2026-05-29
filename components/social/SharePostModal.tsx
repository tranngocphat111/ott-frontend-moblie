import { MediaApi, type Post, type Visibility } from '@/services/api/media.api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { SOCIAL_COLORS, useFullScreenModalPadding } from './socialTheme';

const SHARE_VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'PUBLIC', label: 'Công khai', icon: 'earth' },
  { value: 'FRIENDS', label: 'Bạn bè', icon: 'people' },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', icon: 'lock-closed' },
];
const resolveRootPost = (input: Post): Post => {
  const seen = new Set<string>();
  let current = input;
  while (current.sharedPost && !seen.has(current.id)) {
    seen.add(current.id);
    current = current.sharedPost;
  }
  return current;
};

export function SharePostModal({
  visible,
  post,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onClose,
  onShared,
}: {
  visible: boolean;
  post: Post | null;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onClose: () => void;
  onShared: (post: Post) => void;
}) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [submitting, setSubmitting] = useState(false);
  const modalPadding = useFullScreenModalPadding();

  useEffect(() => {
    if (!visible) return;
    setCaption('');
    setVisibility('PUBLIC');
  }, [visible, post?.id]);

  const submit = async () => {
    if (!post || !currentUserId || submitting) return;
    setSubmitting(true);
    try {
      const result = await MediaApi.sharePost(post.id, currentUserId, caption.trim() || undefined, visibility);
      if (!result.post) {
        Alert.alert('Không chia sẻ được', result.error || 'Vui lòng thử lại sau.');
        return;
      }
      onShared(result.post);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(post && currentUserId) && !submitting;
  const previewPost = post ? (post.sharedPost ? resolveRootPost(post.sharedPost) : post) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1" style={[modalPadding, { backgroundColor: SOCIAL_COLORS.page }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="h-14 flex-row items-center justify-between border-b px-4" style={{ borderColor: SOCIAL_COLORS.border }}>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={onClose}>
              <Feather name="x" size={21} color={SOCIAL_COLORS.primaryDark} />
            </TouchableOpacity>
            <Text className="text-lg font-bold" style={{ color: SOCIAL_COLORS.text }}>Chia sẻ bài viết</Text>
            <TouchableOpacity
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: canSubmit ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chip }}
              disabled={!canSubmit}
              onPress={submit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-bold" style={{ color: canSubmit ? '#fff' : SOCIAL_COLORS.textSoft }}>Đăng</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
            <View className="flex-row items-center">
              <Avatar uri={currentUserAvatar} name={currentUserName} />
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-bold" style={{ color: SOCIAL_COLORS.text }}>
                  {currentUserName || 'Người dùng'}
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {SHARE_VISIBILITY_OPTIONS.map((item) => {
                    const active = visibility === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        className="h-8 flex-row items-center rounded-full border px-3"
                        style={{
                          backgroundColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chipLight,
                          borderColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.border,
                        }}
                        onPress={() => setVisibility(item.value)}
                      >
                        <Ionicons name={item.icon} size={13} color={active ? '#fff' : SOCIAL_COLORS.primary} />
                        <Text className="ml-1.5 text-[11px] font-bold" style={{ color: active ? '#fff' : SOCIAL_COLORS.textMuted }}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Viết gì đó về bài viết này..."
              placeholderTextColor={SOCIAL_COLORS.textSoft}
              className="mt-5 min-h-[96px] text-[18px] leading-7"
              style={{ color: SOCIAL_COLORS.text }}
              textAlignVertical="top"
            />

            {previewPost ? (
              <View className="mt-4 rounded-2xl border p-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
                <View className="flex-row items-center">
                  <Avatar uri={previewPost.author.avatar} name={previewPost.author.name} color={previewPost.author.color} size={36} />
                  <View className="ml-2 flex-1">
                    <Text className="text-[13px] font-black" style={{ color: SOCIAL_COLORS.text }} numberOfLines={1}>
                      {previewPost.author.name}
                    </Text>
                    <Text className="text-[11px]" style={{ color: SOCIAL_COLORS.textMuted }}>
                      {previewPost.time}
                    </Text>
                  </View>
                </View>
                {previewPost.content.trim() ? (
                  <Text className="mt-3 text-[13px] leading-5" style={{ color: SOCIAL_COLORS.text }} numberOfLines={4}>
                    {previewPost.content}
                  </Text>
                ) : null}
                {previewPost.media.length ? (
                  <View className="mt-3 flex-row overflow-hidden rounded-xl" style={{ height: 88, backgroundColor: SOCIAL_COLORS.primaryDark }}>
                    {previewPost.media.slice(0, 3).map((item, index) => (
                      <View key={item.id || `${item.url}-${index}`} style={{ flex: 1, borderRightWidth: index < Math.min(previewPost.media.length, 3) - 1 ? 1 : 0, borderColor: '#fff' }}>
                        {(item.type === 'image' || item.thumbnailUrl) && (item.thumbnailUrl || item.url) ? (
                          <ExpoImage source={{ uri: item.thumbnailUrl || item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Feather name="video" size={22} color="#fff" />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
