import React, { useMemo } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ExternalLink, Globe, Link2 } from 'lucide-react-native';
import type { ChatMessage } from '@/types';

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

  const handleOpenLink = async () => {
    if (!safeLink) {
      Alert.alert('Liên kết không hợp lệ', 'Tin nhắn này không chứa liên kết hợp lệ.');
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
      className={`w-full max-w-[250px] self-start overflow-hidden rounded-xl border ${isMine ? 'border-[#e7d5c4] bg-white/50' : 'border-slate-200 bg-white'}`}
    >
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
    </Pressable>
  );
};
