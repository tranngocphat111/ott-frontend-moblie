import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, FileArchive, FileAudio2, FileCode2, FileImage, FileSpreadsheet, FileText, FileVideo } from 'lucide-react-native';
import type { ChatMessage } from '@/types/entities/chat';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  onLongPress?: (event: any) => void;
  fullWidth?: boolean;
};

const getFirstContent = (message: ChatMessage) => {
  const first = Array.isArray(message.content) ? message.content[0] : null;
  if (!first) return { name: '', url: '', size: message.size || 0 };
  if (typeof first === 'string') return { name: '', url: first, size: message.size || 0 };
  return {
    name: String(first.name || ''),
    url: String(first.url || first.text || ''),
    size: Number(first.size || message.size || 0),
  };
};

const getFileName = (message: ChatMessage) => {
  const content = getFirstContent(message);
  if (content.name) return content.name;
  const raw = content.url || '';
  const byPath = raw.split('/').pop() || raw;
  return decodeURIComponent(byPath.split('?')[0] || byPath) || 'Tệp đính kèm';
};

const getExt = (name: string) => {
  const ext = name.split('.').pop()?.trim().toLowerCase();
  return ext || '';
};

const formatSize = (size?: number) => {
  const value = Number(size || 0);
  if (!value) return '';
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
};

const getTypeVisual = (ext: string) => {
  if (['doc', 'docx'].includes(ext)) {
    return { label: 'W', bg: '#4b9cd8', fg: '#ffffff', icon: FileText };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { label: 'X', bg: '#33a66f', fg: '#ffffff', icon: FileSpreadsheet };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { label: 'P', bg: '#e08a4b', fg: '#ffffff', icon: FileText };
  }
  if (['pdf'].includes(ext)) {
    return { label: 'PDF', bg: '#d9534f', fg: '#ffffff', icon: FileText };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
    return { label: 'IMG', bg: '#7c9cdb', fg: '#ffffff', icon: FileImage };
  }
  if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) {
    return { label: 'VID', bg: '#7c7fd8', fg: '#ffffff', icon: FileVideo };
  }
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext)) {
    return { label: 'AUD', bg: '#8f7cd8', fg: '#ffffff', icon: FileAudio2 };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { label: 'ZIP', bg: '#8892a0', fg: '#ffffff', icon: FileArchive };
  }
  if (['json', 'xml', 'yml', 'yaml', 'ts', 'tsx', 'js', 'jsx'].includes(ext)) {
    return { label: 'DEV', bg: '#5c8fcb', fg: '#ffffff', icon: FileCode2 };
  }
  return { label: 'FILE', bg: '#7d93aa', fg: '#ffffff', icon: FileText };
};

export const ChatFileMessage: React.FC<Props> = ({ message, isMine, onLongPress, fullWidth }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const fileName = getFileName(message);
  const ext = getExt(fileName);
  const content = getFirstContent(message);
  const sizeLabel = formatSize(content.size);
  const visual = getTypeVisual(ext);

  const handleDownloadFile = async () => {
    const sourceUrl = resolveMediaUrl(content.url || '');
    if (!sourceUrl) {
      Alert.alert('Thông báo', 'Không tìm thấy tệp để tải.');
      return;
    }

    if (isDownloading) {
      return;
    }

    try {
      setIsDownloading(true);
      const safeFileName = String(fileName || 'tep_dinh_kem').replace(/[\\/:*?"<>|]/g, '_');
      const downloadDirectory = new FileSystem.Directory(FileSystem.Paths.cache, 'chat-download');
      await downloadDirectory.create({ intermediates: true, idempotent: true });

      const destinationFile = new FileSystem.File(downloadDirectory, `${Date.now()}_${safeFileName}`);
      const downloadResult = await FileSystem.File.downloadFileAsync(sourceUrl, destinationFile, {
        idempotent: true,
      });

      if (!downloadResult?.uri) {
        throw new Error('Không thể tải tệp');
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Thành công', 'Đã tải tệp thành công.');
        return;
      }

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: `Lưu tệp: ${safeFileName}`,
      });
    } catch (error) {
      console.error('Download file failed:', error);
      Alert.alert('Lỗi', 'Không thể tải tệp. Vui lòng thử lại.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Pressable
      className={`${fullWidth ? 'w-full' : 'w-[260px]'} rounded-xl p-2 py-1.5`}
      onPress={() => void handleDownloadFile()}
      onLongPress={onLongPress}
      delayLongPress={150}
      disabled={isDownloading}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-md"
          style={{ backgroundColor: visual.bg }}
        >
          <Text className="text-[16px] font-bold" style={{ color: visual.fg }} numberOfLines={1}>
            {visual.label}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
            {fileName}
          </Text>
          <Text className="mt-0.5 text-[12px] font-medium uppercase tracking-wide text-slate-500" numberOfLines={1}>
            {(ext || 'file')}{sizeLabel ? ` · ${sizeLabel}` : ''}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Download size={12} color={isDownloading ? '#94a3b8' : '#64748b'} />
            <Text className="ml-1 text-[11px] text-slate-500">
              {isDownloading ? 'Đang tải xuống...' : 'Nhấn để tải xuống'}
            </Text>
          </View>

        </View>
      </View>
    </Pressable>
  );
};
