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
import { useConversationInfo, useNicknameEditor } from "@/hooks/chat";
import { SenderAvatar } from "@/components/chat";

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

  const addableUsers = useMemo(() => {
    const keyword = normalize(searchValue).toLowerCase();
    return allUsers.filter((candidate) => {
      const id = normalize(candidate?.user_id);
      if (!id || memberIds.has(id)) return false;

      if (!keyword) return true;

      const name = normalize(candidate?.name).toLowerCase();
      return id.toLowerCase().includes(keyword) || name.includes(keyword);
    });
  }, [allUsers, memberIds, searchValue]);

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

      const addedBy = normalize(member?.added_by);
      if (addedBy) {
        const addedByName = memberNameById.get(addedBy);
        if (addedByName) return `Thêm bởi ${addedByName}`;
      }
      return "Thành viên";
    },
    [memberNameById, ownerId],
  );

  const handleAddMember = useCallback(
    async (newMemberId: string) => {
      if (!conversationId || !userIdForChat) return;
      try {
        await ChatApi.addMembers(conversationId, userIdForChat, [newMemberId]);
        setMemberModalVisible(false);
        setSearchValue("");
        await loadInfo();
      } catch {
        Alert.alert("Lỗi", "Không thể thêm thành viên");
      }
    },
    [conversationId, userIdForChat, loadInfo],
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

            {isAdmin ? (
              <Pressable
                onPress={() => setMemberModalVisible(true)}
                className="h-10 w-10 items-center justify-center"
              >
                <Feather name="user-plus" size={18} color={THEME_COLORS.neutral.white} />
              </Pressable>
            ) : (
              <View className="h-10 w-10" />
            )}
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
            const isOwner = memberId === ownerId;
            const displayName =
              normalize(item?.nickname) ||
              normalize(item?.user?.name) ||
              normalize(item?.name) ||
              memberId;
            const subtitle = getMemberSubtitle(item);
            const avatarRaw = normalize(item?.avatar) || normalize(item?.user?.avatar);

            return (
              <View className="mb-2 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <SenderAvatar name={displayName} avatarUrl={avatarRaw} />

                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text className="text-[12px] text-slate-500" numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

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
          className="flex-1 justify-end bg-black/35 px-4 pb-8"
          onPress={() => setActionModalVisible(false)}
        >
          <Pressable
            className="rounded-[28px] bg-white px-5 pb-5 pt-4"
            onPress={() => undefined}
          >
            <Text className="mb-4 text-center text-[32px] font-semibold text-slate-800">
              Tùy chọn thành viên
            </Text>

            <Pressable
              onPress={handleOpenNicknameModal}
              className="mb-3 rounded-2xl bg-slate-200 py-3"
            >
              <Text className="text-center text-[30px] font-medium text-slate-800">
                Đổi biệt danh
              </Text>
            </Pressable>

            {(() => {
              const member = selectedMember;
              const memberUserId = normalize(member?.user_id);
              const isSelf = memberUserId === normalize(userIdForChat);
              const isOwner = memberUserId === ownerId;
              const canManage = isAdmin && !isSelf && !isOwner;
              if (!canManage) return null;

              return (
                <>
                  <Pressable
                    onPress={() => void handleMemberRoleUpdate()}
                    className="mb-3 rounded-2xl bg-slate-200 py-3"
                  >
                    <Text className="text-center text-[30px] font-medium text-slate-800">
                      {normalize(member?.roles) === "admin"
                        ? "Gỡ quyền quản trị viên"
                        : "Đặt làm quản trị viên"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleOpenRemoveConfirmation}
                    className="mb-3 rounded-2xl bg-red-100 py-3"
                  >
                    <Text className="text-center text-[30px] font-medium text-red-600">
                      Xóa khỏi nhóm
                    </Text>
                  </Pressable>
                  </>
              );
            })()}

            <Pressable
              onPress={() => setActionModalVisible(false)}
              className="rounded-2xl bg-slate-200 py-3"
            >
              <Text className="text-center text-[30px] font-medium text-slate-800">
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

      <Modal
        visible={memberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setMemberModalVisible(false)}
        >
          <Pressable
            className="max-h-[72%] rounded-t-[24px] bg-white px-4 pb-5 pt-4"
            onPress={() => undefined}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-slate-900">Thêm thành viên</Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setMemberModalVisible(false)}
              >
                <Feather name="x" size={16} color={THEME_COLORS.neutral.slate700} />
              </Pressable>
            </View>

            <View className="mb-3 flex-row items-center rounded-2xl bg-slate-100 px-3">
              <Feather name="search" size={16} color={THEME_COLORS.neutral.slate500} />
              <TextInput
                value={searchValue}
                onChangeText={setSearchValue}
                placeholder="Tìm user để thêm"
                className="ml-2 flex-1 py-2.5 text-[14px] text-slate-900"
              />
            </View>

            <FlatList
              data={addableUsers}
              keyExtractor={(item) => normalize(item?._id) || normalize(item?.user_id)}
              ListEmptyComponent={
                <Text className="py-6 text-center text-[13px] text-slate-500">Không còn user để thêm</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void handleAddMember(normalize(item?.user_id))}
                  className="mb-2 flex-row items-center rounded-2xl border border-slate-200 px-3 py-3"
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    {normalize(item?.avatar) ? (
                      <Image source={{ uri: normalize(item?.avatar) }} className="h-full w-full rounded-full" />
                    ) : (
                      <Feather name="user" size={16} color={THEME_COLORS.neutral.slate500} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">
                      {normalize(item?.name) || normalize(item?.user_id)}
                    </Text>
                    <Text className="text-[12px] text-slate-500">{normalize(item?.user_id)}</Text>
                  </View>
                  <Feather name="plus-circle" size={18} color={THEME_COLORS.primary[600]} />
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
