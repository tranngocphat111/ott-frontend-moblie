import {
  MediaApi,
  resolveMediaUrl,
  type StoryContentItem,
  type StoryItem,
  type StoryUserGroup,
  type Post,
} from "@/services/api/media.api";
import { mediaSocket, type PostActivityPayload } from "@/services/socket/mediaSocket";
import { Feather, Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "./SocialAvatar";
import { CommentsModal } from "./CommentsModal";
import { ReactionsListModal } from "./ReactionsListModal";

export function StoryViewerModal({
  group,
  groups = [],
  currentUserId,
  onGroupChange,
  onDeleted,
  onEditStory,
  onClose,
}: {
  group: StoryUserGroup | null;
  groups?: StoryUserGroup[];
  currentUserId?: string;
  onGroupChange?: (group: StoryUserGroup) => void;
  onDeleted?: (storyId: string) => void;
  onEditStory?: (story: StoryItem) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [viewersVisible, setViewersVisible] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  
  // New States for Playback and Progression
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [pressStartTime, setPressStartTime] = useState(0);

  // New States for Reactions and Comments
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const [reactionMap, setReactionMap] = useState<Record<string, number>>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [submittingReaction, setSubmittingReaction] = useState(false);

  const pendingIndexRef = useRef<number | null>(null);
  const stories = group?.stories || [];
  const story = stories[index];
  const groupIndex =
    group ? groups.findIndex((item) => item.userId === group.userId) : -1;
  const item: StoryContentItem | undefined = story?.items?.[0];
  const storyKind = item?.type || story?.contentType || "UNKNOWN";
  const imageUrl = item?.type === "IMAGE" ? item.url : story?.imageUrl;
  const videoUrl = item?.type === "VIDEO" ? item.url : story?.videoUrl;
  const textContent =
    item?.type === "TEXT" ? item.textContent : story?.textContent;
  const textBackground =
    item?.type === "TEXT" ?
      item.textBackgroundColor
    : story?.textBackgroundColor;

  // Reset all modal state when group is closed/null
  useEffect(() => {
    if (!group) {
      setIndex(0);
      setStoryProgress(0);
      setIsPaused(false);
      setCommentsVisible(false);
      setReactionsVisible(false);
      setViewersVisible(false);
    }
  }, [group]);

  useEffect(() => {
    const pendingIndex = pendingIndexRef.current;
    pendingIndexRef.current = null;
    setIndex(
      Math.max(0, Math.min(pendingIndex ?? 0, Math.max(0, stories.length - 1))),
    );
  }, [group?.userId, stories.length]);

  useEffect(() => {
    if (!story?.id || !currentUserId) return;
    void MediaApi.viewStory(story.id, currentUserId);
    void MediaApi.recordViewHistory(story.id);
    let mounted = true;
    MediaApi.checkIsSaved(story.id).then((saved) => {
      if (mounted) setIsSaved(saved);
    });
    return () => {
      mounted = false;
    };
  }, [currentUserId, story?.id]);

  // Load Story Reactions and User Reaction
  useEffect(() => {
    if (!story?.id) return;
    setStoryProgress(0);
    setIsPaused(false);

    MediaApi.fetchPostReactions(story.id).then((counts) => {
      setReactionMap(counts || {});
    });

    if (currentUserId) {
      MediaApi.fetchUserReactions(currentUserId).then((reactions) => {
        const match = reactions.find((r) => r.targetId === story.id);
        setUserReaction(match?.reactionType || null);
      });
    }
  }, [story?.id, currentUserId]);

  // Realtime listen for reaction and comment counts
  useEffect(() => {
    if (!story?.id) return;

    const handleActivity = (payload: PostActivityPayload) => {
      if (payload.postId !== story.id) return;
      if (
        payload.activityType === "REACTION" ||
        payload.activityType === "COMMENT" ||
        payload.activityType === "VIEW"
      ) {
        MediaApi.fetchPostReactions(story.id).then((counts) => {
          setReactionMap(counts || {});
        });
      }
    };

    void mediaSocket.onPostActivity(handleActivity);
    return () => {
      mediaSocket.offPostActivity(handleActivity);
    };
  }, [story?.id]);

  // Image & Text Auto-Progression Timer Effect
  useEffect(() => {
    if (
      !group ||
      !story ||
      isPaused ||
      storyKind === "VIDEO" ||
      commentsVisible ||
      reactionsVisible ||
      viewersVisible
    )
      return;

    const duration = 6000; // 6 seconds
    const intervalTime = 50; // update progress every 50ms
    const steps = duration / intervalTime;
    let currentStep = storyProgress * steps;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        const nextProgress = prev + 1 / steps;
        if (nextProgress >= 1) {
          clearInterval(interval);
          setTimeout(goNext, 0);
          return 1;
        }
        return nextProgress;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [
    group?.userId,
    index,
    isPaused,
    storyKind,
    commentsVisible,
    reactionsVisible,
    viewersVisible,
  ]);

  const isOwner = Boolean(
    (story?.userId || group?.userId) &&
      currentUserId &&
      String(story?.userId || group?.userId) === String(currentUserId),
  );

  const toggleSave = async () => {
    if (!story?.id || saveBusy) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setSaveBusy(true);
    const ok = await MediaApi.toggleSaveContent(story.id, nextSaved);
    setSaveBusy(false);
    if (!ok) {
      setIsSaved(!nextSaved);
      Alert.alert("Không cập nhật được", "Vui lòng thử lại sau.");
    }
  };

  const openViewers = async () => {
    if (!story?.id) return;
    setViewersVisible(true);
    setViewersLoading(true);
    try {
      setViewers(await MediaApi.fetchStoryViewers(story.id));
    } finally {
      setViewersLoading(false);
    }
  };

  const deleteStory = () => {
    if (!story?.id) return;
    Alert.alert("Xóa tin?", "Tin này sẽ bị xóa và không thể hoàn tác.", [
      { text: "Giữ lại", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          if (!story?.id) return;
          const ok = await MediaApi.deleteStory(story.id);
          if (!ok) {
            Alert.alert("Không xóa được", "Vui lòng thử lại sau.");
            return;
          }
          onDeleted?.(story.id);
          closeViewer();
        },
      },
    ]);
  };

  const handleLike = async (key = "LIKE") => {
    if (!story?.id || !currentUserId || submittingReaction) return;
    setSubmittingReaction(true);

    const previousReaction = userReaction;
    const isRemoving = previousReaction === key;

    setUserReaction(isRemoving ? null : key);
    setReactionMap((prev) => {
      const next = { ...prev };
      if (previousReaction) {
        next[previousReaction] = Math.max(0, (next[previousReaction] || 1) - 1);
      }
      if (!isRemoving) {
        next[key] = (next[key] || 0) + 1;
      }
      return next;
    });

    const res = await MediaApi.toggleLike(story.id, currentUserId, key);
    if (!res) {
      setUserReaction(previousReaction); // revert
    } else {
      setUserReaction(res.liked && res.reactionType ? res.reactionType : null);
    }
    setSubmittingReaction(false);
  };

  const viewerName = (viewer: any) =>
    viewer?.accountDisplayName ||
    viewer?.displayName ||
    viewer?.accountUsername ||
    viewer?.username ||
    viewer?.name ||
    "Người dùng";

  const viewerAvatar = (viewer: any) =>
    resolveMediaUrl(
      viewer?.accountAvatarUrl || viewer?.avatarUrl || viewer?.avatar,
    ) || undefined;

  const closeViewer = () => {
    setViewersVisible(false);
    setCommentsVisible(false);
    setReactionsVisible(false);
    onClose();
  };

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }

    if (groupIndex >= 0 && groupIndex < groups.length - 1) {
      const nextGroup = groups[groupIndex + 1];
      pendingIndexRef.current = 0;
      onGroupChange?.(nextGroup);
      return;
    }

    closeViewer();
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      pendingIndexRef.current = Math.max(0, previousGroup.stories.length - 1);
      onGroupChange?.(previousGroup);
    }
  };

  // Video status update handler for progression tracking
  const handlePlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      const progress = Math.min(1, status.positionMillis / status.durationMillis);
      setStoryProgress(progress);
    }
    if (status.didJustFinish) {
      goNext();
    }
  };

  // Press handlers for pausing when holding and navigating when tapping
  const handleLeftPressIn = () => {
    setPressStartTime(Date.now());
    setIsPaused(true);
  };

  const handleLeftPressOut = () => {
    setIsPaused(false);
    const duration = Date.now() - pressStartTime;
    if (duration < 300) {
      goPrev();
    }
  };

  const handleRightPressIn = () => {
    setPressStartTime(Date.now());
    setIsPaused(true);
  };

  const handleRightPressOut = () => {
    setIsPaused(false);
    const duration = Date.now() - pressStartTime;
    if (duration < 300) {
      goNext();
    }
  };

  const totalReactions = Object.values(reactionMap).reduce((a, b) => a + b, 0);

  return (
    <Modal
      visible={!!group}
      animationType="fade"
      transparent
      onRequestClose={closeViewer}>
      <View className="flex-1 bg-black relative">
        {/* Story Content Renderer (Supports Multi-item Stories) */}
        <View className="absolute inset-0 items-center justify-center bg-black">
          {story?.items && story.items.length > 0 ? (
            story.items
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map((item, idx) => {
                const isVideo = item.type === "VIDEO";
                const isImage = item.type === "IMAGE";
                const isText = item.type === "TEXT";
                const itemUrl = resolveMediaUrl(item.url);

                const posX = item.positionX ?? 0.5;
                const posY = item.positionY ?? 0.5;

                if (isImage && itemUrl) {
                  return (
                    <View
                      key={item.id || idx}
                      style={{
                        position: "absolute",
                        left: `${(posX - 0.5) * 100}%`,
                        right: `${-(posX - 0.5) * 100}%`,
                        top: `${(posY - 0.5) * 100}%`,
                        bottom: `${-(posY - 0.5) * 100}%`,
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: item.zIndex,
                      }}>
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          transform: [
                            { scale: item.scale ?? 1 },
                            { rotate: `${item.rotation ?? 0}deg` },
                          ],
                        }}>
                        <ExpoImage
                          source={{ uri: itemUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      </View>
                    </View>
                  );
                }

                if (isVideo && itemUrl) {
                  return (
                    <View
                      key={item.id || idx}
                      style={{
                        position: "absolute",
                        left: `${(posX - 0.5) * 100}%`,
                        right: `${-(posX - 0.5) * 100}%`,
                        top: `${(posY - 0.5) * 100}%`,
                        bottom: `${-(posY - 0.5) * 100}%`,
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: item.zIndex,
                      }}>
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          transform: [
                            { scale: item.scale ?? 1 },
                            { rotate: `${item.rotation ?? 0}deg` },
                          ],
                        }}>
                        <Video
                          source={{ uri: itemUrl }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={
                            !isPaused &&
                            !commentsVisible &&
                            !reactionsVisible &&
                            !viewersVisible
                          }
                          isMuted={isMuted}
                          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                        />
                      </View>
                    </View>
                  );
                }

                if (isText && item.textContent) {
                  return (
                    <View
                      key={item.id || idx}
                      style={{
                        position: "absolute",
                        left: `${(posX - 0.5) * 100}%`,
                        right: `${-(posX - 0.5) * 100}%`,
                        top: `${(posY - 0.5) * 100}%`,
                        bottom: `${-(posY - 0.5) * 100}%`,
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: item.zIndex,
                        paddingHorizontal: 24,
                      }}>
                      <View
                        className="px-4 py-2 rounded-xl"
                        style={{
                          backgroundColor:
                            item.textBackgroundColor || "rgba(0,0,0,0.55)",
                          transform: [
                            { scale: item.scale ?? 1 },
                            { rotate: `${item.rotation ?? 0}deg` },
                          ],
                        }}>
                        <Text style={{ fontSize: 28, fontWeight: '900', lineHeight: 34, color: '#fff', textAlign: 'center' }}>
                          {item.textContent}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return null;
              })
          ) : (
            // Fallback for single-item legacy stories
            storyKind === "IMAGE" && imageUrl ? (
              <ExpoImage
                source={{ uri: resolveMediaUrl(imageUrl) }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : storyKind === "VIDEO" && videoUrl ? (
              <Video
                source={{ uri: resolveMediaUrl(videoUrl) || "" }}
                style={{ width: "100%", height: "100%" }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={
                  !isPaused &&
                  !commentsVisible &&
                  !reactionsVisible &&
                  !viewersVisible
                }
                isMuted={isMuted}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              />
            ) : (
              <View
                className="h-full w-full items-center justify-center px-8"
                style={{ backgroundColor: textBackground || "#111827" }}>
                <Text className="text-center text-[28px] font-black leading-10 text-white">
                  {textContent || "Tin đang được tải"}
                </Text>
              </View>
            )
          )}
        </View>

        {/* Segmented Top Progress Bars */}
        <View
          className="absolute left-0 right-0 z-20 flex-row gap-1 px-3"
          style={{ top: insets.top + 10 }}>
          {stories.map((s, idx) => {
            let fillWidth: any = "0%";
            if (idx < index) {
              fillWidth = "100%";
            } else if (idx === index) {
              fillWidth = `${storyProgress * 100}%`;
            }
            return (
              <View
                key={s.id || idx}
                className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                <View className="h-full bg-white" style={{ width: fillWidth }} />
              </View>
            );
          })}
        </View>

        {/* Header UI */}
        <View
          className="absolute left-0 right-0 z-20 px-4"
          style={{ top: insets.top + 22 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
                onPress={closeViewer}>
                <Feather name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
              <Avatar
                uri={group?.avatarUrl}
                name={group?.name}
                size={36}
              />
              <View className="ml-2">
                <Text className="text-sm font-bold text-white">
                  {group?.name}
                </Text>
                <Text className="text-[11px] text-white/70">
                  Story ·{" "}
                  {stories.length ?
                    `${index + 1}/${stories.length}`
                  : "Tin"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {/* Play/Pause Control Button */}
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
                onPress={() => setIsPaused(!isPaused)}>
                <Feather name={isPaused ? "play" : "pause"} size={18} color="#fff" />
              </TouchableOpacity>

              {/* Sound Control for Video Content */}
              {storyKind === "VIDEO" && (
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
                  onPress={() => setIsMuted(!isMuted)}>
                  <Ionicons
                    name={isMuted ? "volume-mute-outline" : "volume-high-outline"}
                    size={18}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}

              {/* Save Bookmark Icon */}
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
                disabled={saveBusy}
                onPress={toggleSave}>
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* Edit Icon if Owner */}
              {isOwner && onEditStory && (
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-blue-500/80"
                  onPress={() => {
                    if (story) {
                      closeViewer();
                      onEditStory(story);
                    }
                  }}>
                  <Feather name="edit-2" size={16} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Trash Icon if Owner */}
              {isOwner && (
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-rose-500/80"
                  onPress={deleteStory}>
                  <Feather name="trash-2" size={18} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Close Button */}
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
                onPress={closeViewer}>
                <Feather name="x" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Interaction Bar (Comments, Likes, Views) */}
        <View
          className="absolute left-0 right-0 px-4 z-30 flex-row items-center gap-3"
          style={{ bottom: insets.bottom + 12 }}>
          <TouchableOpacity
            className="flex-1 h-10 rounded-full border border-white/30 bg-black/30 px-4 justify-center"
            onPress={() => setCommentsVisible(true)}>
            <Text className="text-white/90 text-[13px] font-semibold">
              Gửi bình luận...
            </Text>
          </TouchableOpacity>

          {/* Heart Button */}
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-black/30"
            onPress={() => handleLike("LIKE")}>
            {userReaction ?
              <Text className="text-xl">❤️</Text>
            : <Feather name="heart" size={22} color="#fff" />
            }
          </TouchableOpacity>

          {/* Reactions Count */}
          {totalReactions > 0 && (
            <TouchableOpacity
              className="justify-center px-1"
              onPress={() => setReactionsVisible(true)}>
              <Text className="text-white text-xs font-bold underline">
                {totalReactions}
              </Text>
            </TouchableOpacity>
          )}

          {/* Owner Viewer Count */}
          {isOwner && (
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-black/30"
              onPress={openViewers}>
              <Feather name="eye" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tap overlays to navigate & hold to pause */}
        <Pressable
          className="absolute left-0 w-1/2 z-10"
          style={{ top: 100, bottom: 100 }}
          onPressIn={handleLeftPressIn}
          onPressOut={handleLeftPressOut}
        />
        <Pressable
          className="absolute right-0 w-1/2 z-10"
          style={{ top: 100, bottom: 100 }}
          onPressIn={handleRightPressIn}
          onPressOut={handleRightPressOut}
        />

        {/* Viewers modal */}
        <Modal
          visible={viewersVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setViewersVisible(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="max-h-[70%] rounded-t-[28px] bg-white px-4 pb-6 pt-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-black text-slate-900">
                  Người đã xem
                </Text>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  onPress={() => setViewersVisible(false)}>
                  <Feather name="x" size={19} color="#0f172a" />
                </TouchableOpacity>
              </View>
              {viewersLoading ?
                <View className="items-center py-8">
                  <ActivityIndicator color="#0f172a" />
                </View>
              : <ScrollView>
                  {viewers.length ?
                    viewers.map((viewer, viewerIndex) => (
                      <View
                        key={viewer?.id || viewer?.accountId || viewerIndex}
                        className="flex-row items-center border-b border-slate-100 py-3">
                        <Avatar
                          uri={viewerAvatar(viewer)}
                          name={viewerName(viewer)}
                          size={42}
                        />
                        <Text
                          className="ml-3 flex-1 text-[15px] font-bold text-slate-900"
                          numberOfLines={1}>
                          {viewerName(viewer)}
                        </Text>
                      </View>
                    ))
                  : <Text className="py-8 text-center text-sm font-semibold text-slate-500">
                      Chưa có lượt xem
                    </Text>
                  }
                </ScrollView>
              }
            </View>
          </View>
        </Modal>

        {/* Comments Modal overlay */}
        <CommentsModal
          visible={commentsVisible}
          post={{ id: story?.id } as Post}
          currentUserId={currentUserId}
          onClose={() => setCommentsVisible(false)}
          onCountChange={(postId, delta) => {
            // Callback placeholder
          }}
        />

        {/* Reactions List Modal overlay */}
        <ReactionsListModal
          visible={reactionsVisible}
          post={{ id: story?.id } as Post}
          onClose={() => setReactionsVisible(false)}
        />
      </View>
    </Modal>
  );
}
