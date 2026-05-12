import { Alert, Linking, Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { ExternalLink, Globe, Link2, Users } from 'lucide-react-native';
import { useAuth } from '@/contexts/Authcontext';
import { ChatApi } from '@/services/api';
import { useRouter } from 'expo-router';
import type { ChatMessage } from '@/types/entities/chat';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  onLongPress?: (event: any) => void;
};

const getRawLink = (message: ChatMessage) => {
  const first = Array.isArray(message.content) ? message.content[0] : message.content;
  if (typeof first === 'string') return first;
  if (!first || typeof first !== 'object') return '';
  return String(first.url || first.text || first.name || '');
};

const getSafeLink = (rawValue: string): string | null => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return null;

  const maybeUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(maybeUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export const ChatLinkMessage: React.FC<Props> = ({ message, isMine, onLongPress }) => {
  const rawText = getRawLink(message);

  const { safeLink, domain, favicon } = useMemo(() => {
    const link = getSafeLink(rawText);
    if (!link) return { safeLink: null, domain: '', favicon: '' };

    try {
      const urlObj = new URL(link);
      const host = urlObj.hostname.replace('www.', '');
      return {
        safeLink: link,
        domain: host,
        favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
      };
    } catch {
      return { safeLink: null, domain: '', favicon: '' };
    }
  }, [rawText]);

  const isPureLink = useMemo(() => {
    if (!safeLink) return false;
    const cleanText = rawText.trim().toLowerCase().replace(/\/$/, '');
    const cleanLink = safeLink.toLowerCase().replace(/\/$/, '');
    return cleanText === cleanLink || cleanText === domain.toLowerCase();
  }, [domain, rawText, safeLink]);

  const { chatUserId } = useAuth();
  const router = useRouter();
  const [groupInfo, setGroupInfo] = useState<{ conversation: any; isMember: boolean } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const isGroupInviteLink = useMemo(() => {
    if (!safeLink) return false;
    return safeLink.includes('/join?token=');
  }, [safeLink]);

  const inviteToken = useMemo(() => {
    if (!isGroupInviteLink || !safeLink) return null;
    const match = safeLink.match(/[?&]token=([^&]+)/);
    return match ? match[1] : null;
  }, [isGroupInviteLink, safeLink]);

  useEffect(() => {
    if (inviteToken && isGroupInviteLink) {
      setLoadingGroup(true);
      ChatApi.getInviteLinkInfo(inviteToken, chatUserId || undefined)
        .then((data) => setGroupInfo(data))
        .catch(() => { })
        .finally(() => setLoadingGroup(false));
    }
  }, [inviteToken, isGroupInviteLink, chatUserId]);

  const handleOpenLink = async () => {
    if (!safeLink) {
      Alert.alert('Liên kết không hợp lệ', 'Tin nhắn này không chứa liên kết hợp lệ.');
      return;
    }

    if (isGroupInviteLink && groupInfo) {
      if (groupInfo.isMember) {
        // Chuyển hướng thẳng tới chat
        router.push(`/(main)/chat/${groupInfo.conversation._id}`);
      } else {
        // Hiện thông báo xác nhận tham gia
        Alert.alert(
          'Tham gia nhóm',
          `Bạn có muốn tham gia nhóm "${groupInfo.conversation.name}" không?`,
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Tham gia',
              onPress: async () => {
                try {
                  if (!inviteToken || !chatUserId) return;
                  const result = await ChatApi.joinByInviteLink(inviteToken, chatUserId);
                  Alert.alert('Thành công', 'Bạn đã tham gia nhóm.');
                  router.push(`/(main)/chat/${result.conversation._id}`);
                } catch (err: any) {
                  Alert.alert('Lỗi', err.message || 'Không thể tham gia nhóm');
                }
              }
            }
          ]
        );
      }
      return;
    }

    try {
      await Linking.openURL(safeLink);
    } catch {
      Alert.alert('Lỗi', 'Không thể mở liên kết này.');
    }
  };

  return (
    <Pressable
      onPress={() => void handleOpenLink()}
      onLongPress={onLongPress}
      className={`w-full max-w-[280px] self-start overflow-hidden rounded-xl border ${isMine ? 'border-[#e7d5c4] bg-white/50' : 'border-slate-200 bg-white'}`}
    >
      {isGroupInviteLink ? (
        <View>
          <View className="bg-primary-600 px-4 py-6 flex-row items-center gap-4">
            <View className="w-14 h-14 bg-white rounded-full items-center justify-center">
              {loadingGroup ? (
                <ActivityIndicator color="#8b6642" size="small" />
              ) : (
                <Users size={28} color="#8b6642" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-white/80 text-[12px] font-medium uppercase">Nhóm</Text>
              <Text className="text-white text-[16px] font-bold" numberOfLines={1}>
                {loadingGroup ? 'Đang tải...' : (groupInfo?.conversation?.name || 'Link tham gia nhóm')}
              </Text>
            </View>
          </View>
          <View className="px-4 py-3 bg-white flex-row justify-between items-center">
            <View>
              <Text className="text-[14px] font-bold text-slate-900">Tham gia nhóm chat</Text>
              <Text className="text-[12px] text-slate-500">Bấm để xem chi tiết</Text>
            </View>
            {groupInfo?.isMember && (
              <View className="bg-primary-100 px-2 py-1 rounded-full">
                <Text className="text-[10px] font-bold text-primary-700">Đã tham gia</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between px-3 pt-2.5">
            <View className="flex-1 min-w-0 flex-row items-center gap-2">
              {favicon ? (
                <Image
                  source={{ uri: favicon }}
                  style={{ width: 14, height: 14 }}
                  contentFit="contain"
                />
              ) : (
                <Globe size={14} color={isMine ? '#8b6642' : '#64748b'} />
              )}
              <Text className="text-[11px] uppercase tracking-wide font-semibold text-slate-500" numberOfLines={1}>
                {domain || 'Liên kết'}
              </Text>
            </View>
            <ExternalLink size={14} color={isMine ? '#8b6642' : '#64748b'} />
          </View>

          <View className={`mx-2 mb-2 mt-2 rounded-lg px-3 py-2.5 ${isMine ? 'bg-white/70' : 'bg-slate-50'}`}>
            <Text className="text-[14px] leading-5 text-slate-900" numberOfLines={2}>
              {rawText || 'Liên kết'}
            </Text>
            {!!safeLink && !isPureLink && (
              <View className="mt-2 flex-row items-center gap-1">
                <Link2 size={11} color="#64748b" />
                <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                  {safeLink}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
};
