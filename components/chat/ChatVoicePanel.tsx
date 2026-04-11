import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  height: number;
  accentColor: string;
  recordingDurationMs: number;
  isRecordingVoice: boolean;
  isSendingAttachment: boolean;
  onToggleRecord: () => void;
  onLongPressRecord: () => void;
  onReleaseRecord: () => void;
  onSendVoice: () => void;
  onClose: () => void;
  formatVoiceDuration: (durationMs: number) => string;
};

export const ChatVoicePanel: React.FC<Props> = ({
  height,
  accentColor,
  recordingDurationMs,
  isRecordingVoice,
  isSendingAttachment,
  onToggleRecord,
  onLongPressRecord,
  onReleaseRecord,
  onSendVoice,
  onClose,
  formatVoiceDuration,
}) => {
  return (
    <View className="border-t border-slate-200 bg-white px-6 pb-6 pt-5" style={{ height }}>
      <Text className="text-center text-[28px] font-semibold text-slate-900">
        {formatVoiceDuration(recordingDurationMs)}
      </Text>
      <Text className="mt-2 text-center text-[16px] text-slate-600">Bấm hoặc bấm giữ để ghi âm</Text>

      <View className="mt-8 items-center">
        <Pressable
          onPress={onToggleRecord}
          onLongPress={onLongPressRecord}
          onPressOut={onReleaseRecord}
          delayLongPress={120}
          className={`h-28 w-28 items-center justify-center rounded-full ${isRecordingVoice ? 'bg-red-500' : ''}`}
          style={!isRecordingVoice ? { backgroundColor: accentColor } : undefined}
        >
          <Feather name="mic" size={40} color="#fff" />
        </Pressable>
      </View>

      <View className="mt-10 flex-row overflow-hidden rounded-full bg-slate-100">
        <Pressable
          onPress={onSendVoice}
          disabled={!isRecordingVoice || isSendingAttachment}
          className={`flex-1 items-center py-3 ${isRecordingVoice ? 'bg-white' : 'bg-transparent'}`}
        >
          <Text className={`text-[18px] font-medium ${isRecordingVoice ? 'text-slate-900' : 'text-slate-400'}`}>
            Gửi bản ghi âm
          </Text>
        </Pressable>
        <Pressable onPress={onClose} className="flex-1 items-center py-3">
          <Text className="text-[18px] font-medium text-slate-500">Gửi dạng văn bản</Text>
        </Pressable>
      </View>
    </View>
  );
};
