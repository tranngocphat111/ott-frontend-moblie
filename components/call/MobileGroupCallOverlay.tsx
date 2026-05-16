import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatApi } from '@/services/api';
import {
  mobileGroupCallSession,
  type MobileGroupCallSnapshot,
} from '@/services/call/mobileGroupCallSession';
import { chatSocket } from '@/services/socket/chatSocket';
import { LIVEKIT_CONFIG } from '@/configuration/api';
import { getAvatarFallbackLabel, resolveMediaUrl } from '@/utils/chat';

const BROWN = '#9a6a43';
const BROWN_SOFT = '#e8d6c5';

declare const require: any;

type ParticipantDisplay = {
  name: string;
  avatar?: string;
};

type CallMemberOption = {
  id: string;
  name: string;
  avatarUrl: string;
};

type SafeLiveKitGroupCallViewProps = {
  token: string;
  serverUrl: string;
  title: string;
  avatarUrl?: string;
  elapsedLabel: string;
  participantCount: number;
  participantDisplayById: Record<string, ParticipantDisplay>;
  onLeave: () => void;
  onOpenInvite?: () => void;
};

const getMemberId = (member: any) =>
  String(member?.user_id || member?.user?.user_id || member?._id || '').trim();

const getMemberName = (member: any, fallback: string) =>
  String(
    member?.nickname ||
      member?.display_name ||
      member?.name ||
      member?.user?.name ||
      member?.user?.fullName ||
      fallback,
  ).trim();

const getMemberAvatar = (member: any) =>
  resolveMediaUrl(
    String(member?.avatar || member?.user?.avatar || member?.user?.avatarUrl || '').trim(),
  );

const formatElapsed = (startedAt: number | null, now: number) => {
  if (!startedAt) return '00:00';

  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const GroupCallAvatar = ({ title, avatar }: { title: string; avatar: string }) => {
  const [broken, setBroken] = useState(false);
  const avatarUrl = resolveMediaUrl(avatar);
  const showAvatar = !!avatarUrl && !broken;

  useEffect(() => {
    setBroken(false);
  }, [avatarUrl]);

  return (
    <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#d8b79a]/50 bg-[#6f5947]">
      {showAvatar ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <Text className="text-3xl font-bold text-white">
          {getAvatarFallbackLabel(title)}
        </Text>
      )}
    </View>
  );
};

const LiveKitUnavailableView: React.FC<
  SafeLiveKitGroupCallViewProps & { notice?: string }
> = ({
  title,
  avatarUrl,
  elapsedLabel,
  participantCount,
  notice = 'Đang tải phòng camera...',
  onLeave,
  onOpenInvite,
}) => (
  <LinearGradient
    colors={['#4a2f1b', '#21140b', '#0f0a06']}
    style={{ flex: 1 }}
  >
    <SafeAreaView className="flex-1 px-5 py-5">
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/12">
            <Text className="text-base font-bold text-white">
              {getAvatarFallbackLabel(title)}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold text-white" numberOfLines={1}>
              {title}
            </Text>
            <Text className="mt-1 text-xs font-semibold uppercase text-[#dfc0a4]">
              {participantCount} người tham gia
            </Text>
          </View>
        </View>

        <View className="rounded-full bg-[#111827]/70 px-3 py-1.5">
          <Text className="text-xs font-bold text-emerald-300">{elapsedLabel}</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <GroupCallAvatar title={title} avatar={avatarUrl || ''} />
        <Text className="mt-7 text-center text-2xl font-bold text-white">
          Cuộc gọi nhóm
        </Text>
        <View className="mt-4 flex-row items-center rounded-2xl bg-white/10 px-4 py-3">
          <ActivityIndicator color={BROWN_SOFT} />
          <Text className="ml-3 flex-1 text-center text-sm font-semibold text-white/75">
            {notice}
          </Text>
        </View>
      </View>

      <View className="rounded-[32px] border border-[#d8b79a]/25 bg-[#17100b]/85 px-5 py-4">
        <View className="flex-row items-start justify-center gap-4">
          <View className="items-center opacity-50">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#5b422f]">
              <Feather name="mic" size={23} color="#fff" />
            </View>
            <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Tắt mic</Text>
          </View>

          <View className="items-center opacity-50">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#5b422f]">
              <Feather name="video" size={23} color="#fff" />
            </View>
            <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Tắt cam</Text>
          </View>

          {onOpenInvite && (
            <View className="items-center">
              <Pressable
                onPress={onOpenInvite}
                className="h-14 w-14 items-center justify-center rounded-full bg-[#b78457]"
              >
                <Feather name="user-plus" size={23} color="#fff" />
              </Pressable>
              <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Thêm</Text>
            </View>
          )}

          <View className="items-center">
            <Pressable
              onPress={onLeave}
              className="h-14 w-14 items-center justify-center rounded-full bg-[#ef4444]"
            >
              <Feather name="phone-off" size={23} color="#fff" />
            </Pressable>
            <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Kết thúc</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  </LinearGradient>
);

const SafeLiveKitGroupCallView: React.FC<SafeLiveKitGroupCallViewProps> = (props) => {
  const [LiveKitView, setLiveKitView] = useState<React.ComponentType<any> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    try {
      const livekitNative = require('@livekit/react-native');
      livekitNative?.registerGlobals?.();
      const module = require('./LiveKitGroupCallView');
      if (mounted && module?.LiveKitGroupCallView) {
        setLiveKitView(() => module.LiveKitGroupCallView);
      }
    } catch (error) {
      console.warn('Không thể tải LiveKit group call mobile:', error);
      if (mounted) setFailed(true);
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (failed) {
    return (
      <LiveKitUnavailableView
        {...props}
        notice="Không thể tải camera cuộc gọi. Hãy thoát ra và tham gia lại."
      />
    );
  }

  if (!LiveKitView) {
    return <LiveKitUnavailableView {...props} />;
  }

  return <LiveKitView {...props} />;
};

type InviteSheetProps = {
  visible: boolean;
  candidates: CallMemberOption[];
  selectedIds: string[];
  submitting: boolean;
  onClose: () => void;
  onToggle: (memberId: string) => void;
  onSubmit: () => void;
};

const InviteMembersSheet: React.FC<InviteSheetProps> = ({
  visible,
  candidates,
  selectedIds,
  submitting,
  onClose,
  onToggle,
  onSubmit,
}) => {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 justify-end bg-black/55">
      <View className="max-h-[72%] rounded-t-[28px] border border-[#ead8c7] bg-[#fffaf6] px-5 pb-6 pt-5">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-[#231a10]">Thêm vào cuộc gọi</Text>
            <Text className="mt-1 text-xs font-medium text-[#8b6642]">
              Mời thành viên nhóm đang chưa tham gia
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#efe7e0]"
          >
            <Feather name="x" size={20} color="#694d31" />
          </Pressable>
        </View>

        {candidates.length === 0 ? (
          <View className="items-center rounded-2xl border border-[#ead8c7] bg-white px-4 py-8">
            <Feather name="users" size={28} color="#b78457" />
            <Text className="mt-3 text-center text-sm font-semibold text-[#694d31]">
              Tất cả thành viên khả dụng đã ở trong cuộc gọi.
            </Text>
          </View>
        ) : (
          <FlatList
            data={candidates}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => onToggle(item.id)}
                  className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${
                    selected ? 'border-[#b78457] bg-[#f5e8dc]' : 'border-[#ead8c7] bg-white'
                  }`}
                >
                  <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#6f5947]">
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} className="h-full w-full" />
                    ) : (
                      <Text className="text-base font-bold text-white">
                        {getAvatarFallbackLabel(item.name)}
                      </Text>
                    )}
                  </View>
                  <Text className="ml-3 flex-1 text-[14px] font-bold text-[#231a10]" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      selected ? 'bg-[#b78457]' : 'border border-[#d8b79a] bg-white'
                    }`}
                  >
                    {selected && <Feather name="check" size={15} color="#fff" />}
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        <Pressable
          disabled={selectedIds.length === 0 || submitting}
          onPress={onSubmit}
          className={`mt-4 h-12 items-center justify-center rounded-2xl ${
            selectedIds.length === 0 || submitting ? 'bg-[#d8c8b8]' : 'bg-[#8b6642]'
          }`}
        >
          <Text className="text-sm font-bold text-white">
            {submitting ? 'Đang mời...' : `Mời ${selectedIds.length || ''}`.trim()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export const MobileGroupCallOverlay = () => {
  const [snapshot, setSnapshot] = useState<MobileGroupCallSnapshot>(
    mobileGroupCallSession.getSnapshot(),
  );
  const [now, setNow] = useState(Date.now());
  const [groupMembers, setGroupMembers] = useState<CallMemberOption[]>([]);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  useEffect(() => {
    return mobileGroupCallSession.subscribe(() => {
      setSnapshot(mobileGroupCallSession.getSnapshot());
    });
  }, []);

  useEffect(() => {
    if (!snapshot.visible || !snapshot.startedAt) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [snapshot.startedAt, snapshot.visible]);

  useEffect(() => {
    if (!snapshot.visible || !snapshot.conversationId) {
      setGroupMembers([]);
      setInviteVisible(false);
      setSelectedInviteeIds([]);
      return;
    }

    let cancelled = false;
    ChatApi.getConversationMembers(snapshot.conversationId)
      .then((members) => {
        if (cancelled) return;

        const mapped = (members || [])
          .map((member: any) => {
            const id = getMemberId(member);
            if (!id) return null;

            return {
              id,
              name: getMemberName(member, id),
              avatarUrl: getMemberAvatar(member),
            };
          })
          .filter((member): member is CallMemberOption => !!member);

        setGroupMembers(mapped);
      })
      .catch((error) => {
        console.warn('Không thể tải thành viên cuộc gọi nhóm:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot.conversationId, snapshot.visible]);

  const title = snapshot.title || 'Cuộc gọi nhóm';
  const participantCount =
    snapshot.participantCount ||
    snapshot.participants.length ||
    (snapshot.status === 'idle' ? 0 : 1);
  const elapsed = useMemo(
    () => formatElapsed(snapshot.startedAt, now),
    [now, snapshot.startedAt],
  );
  const isConnecting = snapshot.status === 'connecting';
  const isActive = snapshot.status === 'active';
  const isError = snapshot.status === 'error';

  const statusLabel = isError
    ? snapshot.error || 'Không thể kết nối cuộc gọi nhóm.'
    : isActive
      ? 'Đã tham gia cuộc gọi'
      : 'Đang kết nối cuộc gọi...';
  const livekitServerUrl = LIVEKIT_CONFIG.URL.trim();
  const canUseLiveKit =
    isActive &&
    LIVEKIT_CONFIG.ENABLE_NATIVE &&
    !!snapshot.livekitToken &&
    !!livekitServerUrl;
  const participantIdSet = useMemo(
    () => new Set(snapshot.participants.map((id) => String(id || '').trim()).filter(Boolean)),
    [snapshot.participants],
  );
  const participantDisplayById = useMemo(() => {
    const map: Record<string, ParticipantDisplay> = {};
    groupMembers.forEach((member) => {
      map[member.id] = {
        name: member.id === snapshot.userId ? 'Bạn' : member.name,
        avatar: member.avatarUrl,
      };
    });

    if (snapshot.userId && !map[snapshot.userId]) {
      map[snapshot.userId] = { name: 'Bạn' };
    }

    return map;
  }, [groupMembers, snapshot.userId]);
  const inviteCandidates = useMemo(
    () =>
      groupMembers.filter(
        (member) =>
          member.id &&
          member.id !== snapshot.userId &&
          !participantIdSet.has(member.id),
      ),
    [groupMembers, participantIdSet, snapshot.userId],
  );

  const closeCall = () => {
    if (isError) {
      mobileGroupCallSession.closeError();
      return;
    }
    void mobileGroupCallSession.leaveCurrentCall();
  };

  const openInvite = () => {
    setSelectedInviteeIds([]);
    setInviteVisible(true);
  };

  const toggleInvitee = (memberId: string) => {
    setSelectedInviteeIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const submitInvite = () => {
    if (
      !snapshot.conversationId ||
      !snapshot.userId ||
      selectedInviteeIds.length === 0 ||
      inviteSubmitting
    ) {
      return;
    }

    setInviteSubmitting(true);
    try {
      chatSocket.inviteCallMembers(
        snapshot.conversationId,
        snapshot.callId || null,
        selectedInviteeIds,
        snapshot.userId,
      );
      setInviteVisible(false);
      setSelectedInviteeIds([]);
    } finally {
      setInviteSubmitting(false);
    }
  };

  if (snapshot.visible && canUseLiveKit) {
    return (
      <Modal
        visible={snapshot.visible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeCall}
      >
        <View className="flex-1">
          <SafeLiveKitGroupCallView
            token={snapshot.livekitToken}
            serverUrl={livekitServerUrl}
            title={title}
            avatarUrl={snapshot.avatar}
            elapsedLabel={elapsed}
            participantCount={participantCount}
            participantDisplayById={participantDisplayById}
            onLeave={() => void mobileGroupCallSession.leaveCurrentCall()}
            onOpenInvite={openInvite}
          />
          <InviteMembersSheet
            visible={inviteVisible}
            candidates={inviteCandidates}
            selectedIds={selectedInviteeIds}
            submitting={inviteSubmitting}
            onClose={() => setInviteVisible(false)}
            onToggle={toggleInvitee}
            onSubmit={submitInvite}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={snapshot.visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={closeCall}
    >
      <LinearGradient
        colors={['#4a2f1b', '#21140b', '#0f0a06']}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 px-5 py-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/12">
                <Text className="text-base font-bold text-white">
                  {getAvatarFallbackLabel(title)}
                </Text>
              </View>
              <View>
                <Text className="text-xl font-bold text-white" numberOfLines={1}>
                  {title}
                </Text>
                <Text className="mt-1 text-xs font-semibold uppercase text-[#dfc0a4]">
                  {participantCount} người tham gia
                </Text>
              </View>
            </View>

            <View className="rounded-full bg-[#111827]/70 px-3 py-1.5">
              <Text className="text-xs font-bold text-emerald-300">{elapsed}</Text>
            </View>
          </View>

          <View className="flex-1 items-center justify-center px-4">
            <GroupCallAvatar title={title} avatar={snapshot.avatar} />

            <Text className="mt-7 text-center text-2xl font-bold text-white">
              Cuộc gọi nhóm
            </Text>
            <Text className="mt-2 text-center text-sm text-white/65">
              {statusLabel}
            </Text>

            {isConnecting && (
              <View className="mt-6 rounded-full bg-white/10 px-4 py-3">
                <ActivityIndicator color={BROWN_SOFT} />
              </View>
            )}

            {isError && (
              <View className="mt-6 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3">
                <Text className="text-center text-sm font-medium text-red-100">
                  Vui lòng quay lại cuộc trò chuyện và thử tham gia lại.
                </Text>
              </View>
            )}
          </View>

          <View className="rounded-[32px] border border-[#d8b79a]/25 bg-[#17100b]/85 px-5 py-4">
            <View className="flex-row items-start justify-center gap-4">
              {!isError && (
                <>
                  <View className="items-center opacity-50">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-[#5b422f]">
                      <Feather name="mic" size={23} color="#fff" />
                    </View>
                    <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Tắt mic</Text>
                  </View>

                  <View className="items-center opacity-50">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-[#5b422f]">
                      <Feather name="video" size={23} color="#fff" />
                    </View>
                    <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Tắt cam</Text>
                  </View>

                  <View className="items-center">
                    <Pressable
                      onPress={openInvite}
                      className="h-14 w-14 items-center justify-center rounded-full bg-[#b78457]"
                    >
                      <Feather name="user-plus" size={23} color="#fff" />
                    </Pressable>
                    <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Thêm</Text>
                  </View>

                  <View className="items-center">
                    <Pressable
                      onPress={() => void mobileGroupCallSession.leaveCurrentCall()}
                      className="h-14 w-14 items-center justify-center rounded-full bg-[#ef4444]"
                    >
                      <Feather name="phone-off" size={23} color="#fff" />
                    </Pressable>
                    <Text className="mt-1.5 text-[11px] font-semibold text-white/80">Kết thúc</Text>
                  </View>
                </>
              )}

              {isError && (
                <Pressable
                  onPress={() => mobileGroupCallSession.closeError()}
                  className="min-w-[180px] items-center rounded-full px-5 py-4"
                  style={{ backgroundColor: BROWN }}
                >
                  <Text className="text-sm font-bold text-white">Đóng</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
        <InviteMembersSheet
          visible={inviteVisible}
          candidates={inviteCandidates}
          selectedIds={selectedInviteeIds}
          submitting={inviteSubmitting}
          onClose={() => setInviteVisible(false)}
          onToggle={toggleInvitee}
          onSubmit={submitInvite}
        />
      </LinearGradient>
    </Modal>
  );
};
