import {
  MediaApi,
  type AccessControl,
  type FriendOption,
  type StoryItem,
  type Visibility,
} from "@/services/api/media.api";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FriendSelector } from "./FriendSelector";
import { VisibilityPills } from "./VisibilityPills";
import {
  draftFromPickerAsset,
  SOCIAL_COLORS,
  STORY_BACKGROUNDS,
  type DraftMediaItem,
  useFullScreenModalPadding,
} from "./socialTheme";

export function CreateStoryModal({
  visible,
  userId,
  initialStory,
  onClose,
  onCreated,
}: {
  visible: boolean;
  userId?: string;
  initialStory?: StoryItem | null;
  onClose: () => void;
  onCreated: (story?: any) => void;
}) {
  const [text, setText] = useState("");
  const [background, setBackground] = useState(STORY_BACKGROUNDS[0]);
  const [media, setMedia] = useState<DraftMediaItem | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("FRIENDS");
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customRuleType, setCustomRuleType] =
    useState<AccessControl["ruleType"]>("INCLUDE");
  const [submitting, setSubmitting] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const modalPadding = useFullScreenModalPadding();

  useEffect(() => {
    if (!visible) return;
    if (initialStory) {
      const textItem = initialStory.items?.find((item) => item.type === "TEXT");
      const mediaItem = initialStory.items?.find(
        (item) => item.type === "IMAGE" || item.type === "VIDEO",
      );
      const mediaUrl =
        mediaItem?.url || initialStory.imageUrl || initialStory.videoUrl;
      const normalizedVisibility = String(
        initialStory.visibility || "FRIENDS",
      ).toUpperCase();
      setText(textItem?.textContent || initialStory.textContent || "");
      setBackground(
        textItem?.textBackgroundColor ||
          initialStory.textBackgroundColor ||
          STORY_BACKGROUNDS[0],
      );
      setMedia(
        mediaUrl ?
          {
            draftId: `story-${initialStory.id}`,
            id: mediaItem?.id,
            type:
              mediaItem?.type === "VIDEO" || initialStory.videoUrl ?
                "video"
              : "image",
            url: mediaUrl,
            caption: "",
            isExisting: true,
          }
        : null,
      );
      setVisibility(
        (
          normalizedVisibility === "PUBLIC" ||
            normalizedVisibility === "PRIVATE" ||
            normalizedVisibility === "CUSTOM"
        ) ?
          normalizedVisibility
        : "FRIENDS",
      );
      setSelectedFriendIds(
        (initialStory.accessControls || []).map((item) => item.accountId),
      );
      setCustomRuleType(
        initialStory.accessControls?.[0]?.ruleType || "INCLUDE",
      );
    } else {
      setText("");
      setBackground(STORY_BACKGROUNDS[0]);
      setMedia(null);
      setVisibility("FRIENDS");
      setSelectedFriendIds([]);
      setCustomRuleType("INCLUDE");
    }
    setFriendSearch("");
  }, [initialStory, visible]);

  useEffect(() => {
    if (!visible || visibility !== "CUSTOM" || !userId || friends.length > 0)
      return;
    setFriendsLoading(true);
    MediaApi.fetchFriends(userId)
      .then(setFriends)
      .finally(() => setFriendsLoading(false));
  }, [friends.length, userId, visibility, visible]);

  const pickStoryMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Cần quyền truy cập",
        "Vui lòng cho phép ứng dụng truy cập thư viện ảnh.",
      );
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
      prev.includes(friendId) ?
        prev.filter((id) => id !== friendId)
      : [...prev, friendId],
    );
  };

  const submit = async () => {
    if (!userId || submitting) return;
    if (!text.trim() && !media) return;
    if (visibility === "CUSTOM" && selectedFriendIds.length === 0) return;
    setSubmitting(true);
    try {
      let uploadedKey: string | undefined;
      if (media?.file) {
        const uploaded = await MediaApi.uploadStoryMedia(media.file);
        if (!uploaded?.fileKey) {
          Alert.alert("Không tải được media", "Vui lòng thử lại sau.");
          return;
        }
        uploadedKey = uploaded.fileKey;
      }

      const accessControls =
        visibility === "CUSTOM" ?
          selectedFriendIds.map((accountId) => ({
            accountId,
            ruleType: customRuleType,
          }))
        : undefined;

      const storyItems =
        media ?
          [
            {
              id: initialStory?.items?.find(it => it.type === "IMAGE" || it.type === "VIDEO")?.id || undefined,
              type: media.type === "video" ? "VIDEO_ITEM" : "IMAGE_ITEM",
              imageItem:
                media.type === "image" ?
                  {
                    url: uploadedKey || media.url,
                    width: 1080,
                    height: 1920,
                  }
                : null,
              videoItem:
                media.type === "video" ?
                  {
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
            ...(text.trim() ?
              [
                {
                  id: initialStory?.items?.find(it => it.type === "TEXT")?.id || undefined,
                  type: "TEXT_ITEM",
                  imageItem: null,
                  videoItem: null,
                  textItem: {
                    content: text.trim(),
                    color: "#ffffff",
                    backgroundColor: "transparent",
                    alignment: "CENTER",
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
              id: initialStory?.items?.find(it => it.type === "TEXT")?.id || undefined,
              type: "TEXT_ITEM",
              textItem: {
                content: text.trim(),
                color: "#ffffff",
                backgroundColor: background,
                alignment: "CENTER",
              },
              isPrimary: true,
              zIndex: 1,
              positionX: 0.5,
              positionY: 0.5,
              rotation: 0,
              scale: 1,
            },
          ];

      const request = {
        userId,
        visibility,
        accessControls,
        isHighlight: false,
        expireAt:
          initialStory?.expireAt ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        storyItems,
      };

      const story =
        initialStory ?
          await MediaApi.updateStory(initialStory.id, request)
        : await MediaApi.createStory(request);

      if (!story) {
        Alert.alert(
          initialStory ? "Không cập nhật được tin" : "Không tạo được tin",
          "Vui lòng thử lại sau.",
        );
        return;
      }
      onCreated(story);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const canShare =
    Boolean(text.trim() || media) &&
    (visibility !== "CUSTOM" || selectedFriendIds.length > 0) &&
    !submitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View
        className="flex-1"
        style={[modalPadding, { backgroundColor: "#000" }]}>
        <View className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
            onPress={onClose}>
            <Feather name="x" size={21} color="#fff" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-sm font-bold text-white">
              {initialStory ? "Chỉnh sửa tin" : "Tạo tin"}
            </Text>
          </View>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
            onPress={() => {
              setShowBackgrounds(false);
              setSettingsVisible(true);
            }}>
            <Feather name="settings" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center">
          <View
            className="overflow-hidden rounded-[28px] border"
            style={{
              width: "88%",
              aspectRatio: 9 / 16,
              backgroundColor: media ? SOCIAL_COLORS.primaryDark : background,
              borderColor: "rgba(255,255,255,0.1)",
            }}>
            {media ?
              media.type === "video" ?
                <View className="h-full w-full items-center justify-center">
                  <Feather name="video" size={36} color="#fff" />
                  <Text className="mt-3 text-sm font-bold text-white/80">
                    Video story
                  </Text>
                </View>
              : <ExpoImage
                  source={{ uri: media.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />

            : null}
            <TextInput
              ref={textInputRef}
              value={text}
              onChangeText={setText}
              multiline
              placeholder={media ? "Thêm chữ lên tin" : "Viết tin của bạn"}
              placeholderTextColor="rgba(255,255,255,0.65)"
              className={`absolute inset-x-0 ${media ? "bottom-16 min-h-[80px]" : "top-0 h-full"} px-8 text-center text-[27px] font-black leading-10 text-white`}
              textAlignVertical="center"
            />
            {media ?
              <TouchableOpacity
                className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/55"
                onPress={() => setMedia(null)}>
                <Feather name="x" size={18} color="#fff" />
              </TouchableOpacity>
            : null}
          </View>
        </View>

        <View
          className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-6"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
          <View className="flex-row items-center justify-center gap-5">
            <TouchableOpacity
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              onPress={() => textInputRef.current?.focus()}>
              <Feather name="type" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              onPress={pickStoryMedia}>
              <Feather name="image" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
              onPress={() => setShowBackgrounds((prev) => !prev)}>
              <Feather name="droplet" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {showBackgrounds && !media ?
            <View className="mt-4 flex-row justify-center gap-3">
              {STORY_BACKGROUNDS.map((color) => (
                <TouchableOpacity
                  key={color}
                  className="h-10 w-10 rounded-full border-2"
                  style={{
                    backgroundColor: color,
                    borderColor: background === color ? "#fff" : "transparent",
                  }}
                  onPress={() => setBackground(color)}
                />
              ))}
            </View>
          : null}

          <TouchableOpacity
            className="mt-5 h-12 items-center justify-center rounded-2xl"
            style={{
              backgroundColor:
                canShare ? SOCIAL_COLORS.primaryDark : "rgba(255,255,255,0.15)",
            }}
            disabled={!canShare}
            onPress={submit}>
            {submitting ?
              <ActivityIndicator color="#fff" size="small" />
            : <Text
                className="text-sm font-black"
                style={{ color: canShare ? "#fff" : "rgba(255,255,255,0.6)" }}>
                {initialStory ? "Lưu" : "Đăng"}
              </Text>
            }
          </TouchableOpacity>
        </View>

        <Modal
          visible={settingsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSettingsVisible(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="rounded-t-[28px] bg-white px-4 pb-8 pt-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text
                  className="text-base font-bold"
                  style={{ color: SOCIAL_COLORS.text }}>
                  Cài đặt tin
                </Text>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  onPress={() => setSettingsVisible(false)}>
                  <Feather name="x" size={18} color={SOCIAL_COLORS.text} />
                </TouchableOpacity>
              </View>
              <VisibilityPills value={visibility} onChange={setVisibility} />
              <FriendSelector
                visible={visibility === "CUSTOM"}
                friends={friends}
                loading={friendsLoading}
                selectedIds={selectedFriendIds}
                ruleType={customRuleType}
                search={friendSearch}
                onRuleTypeChange={setCustomRuleType}
                onSearchChange={setFriendSearch}
                onToggleFriend={toggleFriend}
              />
              {visibility === "CUSTOM" && selectedFriendIds.length === 0 ?
                <Text className="mt-2 text-xs font-semibold text-red-500">
                  Chọn ít nhất một người cho phạm vi tùy chỉnh.
                </Text>
              : null}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
