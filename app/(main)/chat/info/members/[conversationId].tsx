import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/context/Authcontext";
import { THEME_COLORS } from "@/constants/theme";
import { ChatApi } from "@/services/api";
import { resolveMediaUrl } from "@/utils/chat";
import { useConversationInfo, useNicknameEditor } from "@/hooks/chat";
import { SenderAvatar } from "@/components/chat";
import { AddMemberModal } from "@/components/chat/modals/AddMemberModal";
import { CHAT_API_CONFIG } from "@/configuration/api";

const getFullUrl = (url?: string) => {
  return resolveMediaUrl(url);
};

const normalize = (value: unknown) => String(value || "").trim();

export default function GroupMembersScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, chatUserId } = useAuth();

  const userIdForChat = chatUserId || user?.id;

  const {
    loading,
    conversation,
    members,
    allUsers,
    loadInfo,
  } = useConversationInfo(conversationId, userIdForChat);

  const {
    nicknameModalVisible,
    setNicknameModalVisible,
    nicknameInput,
    setNicknameInput,
    openNicknameEditor,
    submitNickname,
  } = useNicknameEditor({
    conversationId,
    userIdForChat,
    onLoadInfo: loadInfo,
  });

  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [removeConfirmationVisible, setRemoveConfirmationVisible] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

  const ownerId = normalize(conversation?.created_by);

  const myMember = useMemo(
    () =>
      members.find(
        (member) => normalize(member?.user_id) === normalize(userIdForChat),
      ),
    [members, userIdForChat],
  );

  const isOwner = normalize(userIdForChat) === ownerId;
  const isAdmin = normalize(myMember?.roles) === "admin";

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      const id = normalize(member?.user_id);
      if (!id) return;
      map.set(
        id,
        normalize(member?.nickname) ||
        normalize(member?.user?.name) ||
        normalize(member?.name) ||
        id,
      );
    });
    return map;
  }, [members]);

  const memberIds = useMemo(
    () => new Set(members.map((member) => normalize(member?.user_id))),
    [members],
  );

  const visibleMembers = useMemo(() => {
    const keyword = normalize(searchValue).toLowerCase();
    const base = [...members];

    const sorted = base.sort((left, right) => {
      const leftIsOwner = normalize(left?.user_id) === ownerId;
      const rightIsOwner = normalize(right?.user_id) === ownerId;
      if (leftIsOwner !== rightIsOwner) return leftIsOwner ? -1 : 1;

      const leftIsAdmin = normalize(left?.roles) === "admin";
      const rightIsAdmin = normalize(right?.roles) === "admin";
      if (leftIsAdmin !== rightIsAdmin) return leftIsAdmin ? -1 : 1;

      const leftName =
        normalize(left?.nickname) || normalize(left?.user?.name) || normalize(left?.name);
      const rightName =
        normalize(right?.nickname) || normalize(right?.user?.name) || normalize(right?.name);
      return leftName.localeCompare(rightName, "vi");
    });

    if (!keyword) return sorted;

    return sorted.filter((member) => {
      const id = normalize(member?.user_id).toLowerCase();
      const name = (
        normalize(member?.nickname) ||
        normalize(member?.user?.name) ||
        normalize(member?.name)
      ).toLowerCase();
      return id.includes(keyword) || name.includes(keyword);
    });
  }, [members, ownerId, searchValue]);

  const getMemberSubtitle = useCallback(
    (member: any) => {
      const memberId = normalize(member?.user_id);
      if (memberId === ownerId) return "Trưởng nhóm";
      if (normalize(member?.roles) === "admin") return "Phó nhóm";

      return "";
    },
    [memberNameById, ownerId],
  );

  const handleOpenMemberActions = useCallback((member: any) => {
    setSelectedMember(member);
    setActionModalVisible(true);
  }, []);

  const handleMemberRoleUpdate = useCallback(async () => {
    const member = selectedMember;
    const memberUserId = normalize(member?.user_id);
    if (!conversationId || !userIdForChat || !memberUserId) return;

    const nextRole = normalize(member?.roles) === "admin" ? "user" : "admin";
    try {
      await ChatApi.updateMemberRole(
        conversationId,
        memberUserId,
        userIdForChat,
        nextRole,
      );
      setActionModalVisible(false);
      await loadInfo();
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật vai trò");
    }
  }, [conversationId, loadInfo, selectedMember, userIdForChat]);

  const handleTransferOwnership = useCallback(() => {
    const member = selectedMember;
    const memberUserId = normalize(member?.user_id);
    if (!conversationId || !userIdForChat || !memberUserId) return;

    Alert.alert(
      "Nhường chức trưởng nhóm",
      "Sau khi nhường chức, bạn sẽ trở thành thành viên bình thường. Bạn chắc chắn muốn thực hiện?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          style: "destructive",
          onPress: async () => {
            try {
              await ChatApi.transferOwnership(conversationId, userIdForChat, memberUserId);
              setActionModalVisible(false);
              await loadInfo();
            } catch (error: any) {
              Alert.alert("Lỗi", error?.response?.data?.error || "Không thể chuyển quyền");
            }
          },
        },
      ],
    );
  }, [conversationId, loadInfo, selectedMember, userIdForChat]);

  const handleConfirmRemoveMember = useCallback(async () => {
    const member = selectedMember;
    const memberUserId = normalize(member?.user_id);
    if (!conversationId || !userIdForChat || !memberUserId) return;

    setIsRemovingMember(true);
    try {
      await ChatApi.removeMember(
        conversationId,
        memberUserId,
        userIdForChat,
      );
      setActionModalVisible(false);
      setRemoveConfirmationVisible(false);
      await loadInfo();
    } catch {
      Alert.alert("Lỗi", "Không thể xóa thành viên");
    } finally {
      setIsRemovingMember(false);
    }
  }, [conversationId, loadInfo, selectedMember, userIdForChat]);

  const handleOpenRemoveConfirmation = useCallback(() => {
    setActionModalVisible(false);
    setRemoveConfirmationVisible(true);
  }, []);

  const handleOpenNicknameModal = useCallback(() => {
    const member = selectedMember;
    const memberUserId = normalize(member?.user_id);
    const currentName =
      normalize(member?.nickname) ||
      normalize(member?.user?.name) ||
      normalize(member?.name) ||
      memberUserId;
    if (!memberUserId) return;

    setActionModalVisible(false);
    openNicknameEditor(memberUserId, currentName);
  }, [openNicknameEditor, selectedMember]);

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={["left", "right"]}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ paddingHorizontal: 2, paddingBottom: 2, paddingTop: 50 }}
        className="px-4 pb-3"
      >
        <View className="flex-row items-center justify-between px-4 py-1">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center"
          >
            <Feather name="chevron-left" size={24} color={THEME_COLORS.neutral.white} />
          </Pressable>

          <View className="flex-1 items-center">
            <Text className="text-[18px] font-bold text-white" numberOfLines={1}>
              Thành viên nhóm ({members.length})
            </Text>
          </View>

          <View className="flex-row items-center">
            <Pressable
              onPress={() => {
                setShowSearch((prev) => !prev);
                if (showSearch) setSearchValue("");
              }}
              className="h-10 w-10 items-center justify-center"
            >
              <Feather name="search" size={18} color={THEME_COLORS.neutral.white} />
            </Pressable>

            {/* Bất cứ ai trong nhóm cũng có thể thêm thành viên */}
            <Pressable
              onPress={() => setMemberModalVisible(true)}
              className="h-10 w-10 items-center justify-center"
            >
              <Feather name="user-plus" size={18} color={THEME_COLORS.neutral.white} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {showSearch && (
        <View className="bg-white px-4 py-3 border-b border-slate-200">
          <View className="flex-row items-center rounded-2xl bg-slate-100 px-3">
            <Feather name="search" size={16} color={THEME_COLORS.neutral.slate500} />
            <TextInput
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Tìm thành viên"
              className="ml-2 flex-1 py-2.5 text-[14px] text-slate-900"
            />
          </View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME_COLORS.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={visibleMembers}
          keyExtractor={(item, index) => normalize(item?._id) || normalize(item?.user_id) || String(index)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}
          ListEmptyComponent={
            <Text className="py-10 text-center text-[14px] text-slate-500">Không có thành viên phù hợp</Text>
          }
          renderItem={({ item }) => {
            const memberId = normalize(item?.user_id);
            const isMe = memberId === normalize(userIdForChat);
            const memberIsOwner = memberId === ownerId;
            const displayName =
              normalize(item?.nickname) ||
              normalize(item?.user?.name) ||
              normalize(item?.name) ||
              memberId;
            const subtitle = getMemberSubtitle(item);
            const avatarRaw = normalize(item?.avatar) || normalize(item?.user?.avatar);

            // Check if member is a friend
            const friendIds = new Set(allUsers.map(u => normalize(u.user_id)));
            const isStranger = !isMe && !friendIds.has(memberId);

            return (
              <View className="mb-2 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <SenderAvatar name={displayName} avatarUrl={avatarRaw} />

                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
                      {displayName}
                    </Text>

                  </View>
                  {subtitle ? (
                    <Text
                      className="text-[12px] font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>

                {isStranger ? (
                  <Pressable
                    onPress={() => {
                      // Logic to add friend would go here
                      Alert.alert("Thông báo", "Tính năng kết bạn đang được cập nhật");
                    }}
                    className="mr-2 rounded-full bg-primary-50 px-3 py-1.5 border border-primary-100"
                  >
                    <Text className="text-[12px] font-bold text-primary-600">Kết bạn</Text>
                  </Pressable>
                ) : null}

                {/* Only show more button if I am admin or owner, AND this member is not me */}
                {(isAdmin || isOwner) && !isMe ? (
                  <Pressable
                    onPress={() => handleOpenMemberActions(item)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  >
                    <Feather
                      name="more-horizontal"
                      size={16}
                      color={THEME_COLORS.neutral.slate600}
                    />
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/35 px-4 pb-8"
          onPress={() => setActionModalVisible(false)}
        >
          <Pressable
            className="rounded-[28px] bg-white px-5 pb-5 pt-4"
            onPress={() => undefined}
          >
            <Text className="mb-4 text-center text-[18px] font-semibold text-slate-800">
              Tùy chọn thành viên
            </Text>

            <Pressable
              onPress={handleOpenNicknameModal}
              className="mb-3 rounded-2xl bg-slate-200 py-3"
            >
              <Text className="text-center text-[16px] font-medium text-slate-800">
                Đổi biệt danh
              </Text>
            </Pressable>

            {(() => {
              const member = selectedMember;
              const memberUserId = normalize(member?.user_id);
              const isTargetOwner = memberUserId === ownerId;
              const isTargetAdmin = normalize(member?.roles) === "admin";

              return (
                <>
                  {/* Chỉ Trưởng nhóm mới có quyền phân quyền và nhường chức */}
                  {isOwner && !isTargetOwner && (
                    <>
                      <Pressable
                        onPress={() => void handleMemberRoleUpdate()}
                        className="mb-3 rounded-2xl bg-slate-200 py-3"
                      >
                        <Text className="text-center text-[16px] font-medium text-slate-800">
                          {isTargetAdmin ? "Gỡ quyền phó nhóm" : "Đặt làm phó nhóm"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={handleTransferOwnership}
                        className="mb-3 rounded-2xl bg-slate-200 py-3"
                      >
                        <Text className="text-center text-[16px] font-medium text-slate-800">
                          Nhường chức trưởng nhóm
                        </Text>
                      </Pressable>
                    </>
                  )}

                  {/* Trưởng nhóm có thể xóa bất kỳ ai. Phó nhóm chỉ được xóa thành viên thường. */}
                  {(isOwner || (isAdmin && !isTargetAdmin && !isTargetOwner)) && (
                    <Pressable
                      onPress={handleOpenRemoveConfirmation}
                      className="mb-3 rounded-2xl bg-red-100 py-3"
                    >
                      <Text className="text-center text-[16px] font-medium text-red-600">
                        Xóa khỏi nhóm
                      </Text>
                    </Pressable>
                  )}
                </>
              );
            })()}

            <Pressable
              onPress={() => setActionModalVisible(false)}
              className="rounded-2xl bg-slate-200 py-3"
            >
              <Text className="text-center text-[16px] font-medium text-slate-800">
                Hủy
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={removeConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveConfirmationVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/35 px-5"
          onPress={() => !isRemovingMember && setRemoveConfirmationVisible(false)}
        >
          <Pressable className="w-full rounded-2xl bg-white p-5" onPress={() => undefined}>
            <Text className="text-[20px] font-bold text-slate-900">Xóa thành viên</Text>
            <Text className="mt-2 text-[14px] leading-5 text-slate-600">
              Bạn chắc chắn muốn xóa thành viên này khỏi nhóm?
            </Text>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setRemoveConfirmationVisible(false)}
                disabled={isRemovingMember}
                className="flex-1 items-center rounded-xl bg-slate-100 py-3"
              >
                <Text className="text-[14px] font-semibold text-slate-700">Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleConfirmRemoveMember()}
                disabled={isRemovingMember}
                className="flex-1 items-center rounded-xl bg-red-600 py-3"
              >
                {isRemovingMember ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">Xóa</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AddMemberModal
        visible={memberModalVisible}
        conversationId={conversationId || ""}
        currentMembers={members}
        users={allUsers}
        onClose={() => setMemberModalVisible(false)}
        onMembersAdded={() => {
          void loadInfo();
        }}
      />

      <Modal
        visible={nicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNicknameModalVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-5"
          onPress={() => setNicknameModalVisible(false)}
        >
          <Pressable className="w-full rounded-2xl bg-white p-4" onPress={() => undefined}>
            <Text className="text-[16px] font-bold text-slate-900">Đổi biệt danh</Text>
            <TextInput
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="Nhập biệt danh"
              className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setNicknameModalVisible(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5"
              >
                <Text className="text-[13px] font-semibold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitNickname()}
                className="rounded-xl bg-primary-600 px-4 py-2.5"
              >
                <Text className="text-[13px] font-semibold text-white">Lưu</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
