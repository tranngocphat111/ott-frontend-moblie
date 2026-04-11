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
  onStopRecord: () => void;
  onCancelRecord: () => void;
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
  onStopRecord,
  onCancelRecord,
  onSendVoice,
  onClose,
  formatVoiceDuration,
}) => {
  return (
    <View className="border-t border-slate-200 bg-white px-5 pb-5 pt-4" style={{ height }}>


      <Text className="text-center text-[26px] font-semibold text-slate-900">
        {formatVoiceDuration(recordingDurationMs)}
      </Text>
      <Text className="mt-2 text-center text-[14px] text-slate-600">
        {isRecordingVoice ? 'Đang ghi âm, bấm dừng hoặc hủy' : 'Bấm hoặc bấm giữ để ghi âm'}
      </Text>

      <View className="mt-6 items-center">
        <Pressable
          onPress={isRecordingVoice ? onStopRecord : onToggleRecord}
          onLongPress={onLongPressRecord}
          onPressOut={onReleaseRecord}
          delayLongPress={120}
          disabled={isSendingAttachment}
          className={`h-24 w-24 items-center justify-center rounded-full ${isRecordingVoice ? 'bg-red-500' : ''}`}
          style={!isRecordingVoice ? { backgroundColor: accentColor } : undefined}
        >
          <Feather name={isRecordingVoice ? 'stop-circle' : 'mic'} size={40} color="#fff" />
        </Pressable>
      </View>

      <View className="mt-6 flex-row justify-content-center overflow-hidden rounded-full bg-slate-100">
        <Pressable
          onPress={onStopRecord}
          disabled={!isRecordingVoice || isSendingAttachment}
          className={`flex-1 items-center py-3 ${isRecordingVoice ? 'bg-white' : 'bg-transparent'}`}
        >
          <Text className={`text-[16px] font-medium ${isRecordingVoice ? 'text-slate-900' : 'text-slate-400'}`}>
            Dừng
          </Text>
        </Pressable>
        <Pressable
          onPress={onSendVoice}
          disabled={(!isRecordingVoice && recordingDurationMs <= 0) || isSendingAttachment}
          className={`flex-1 items-center py-3 ${(isRecordingVoice || recordingDurationMs > 0) ? 'bg-white' : 'bg-transparent'}`}
        >
          <Text className={`text-[16px] font-medium ${(isRecordingVoice || recordingDurationMs > 0) ? 'text-slate-900' : 'text-slate-400'}`}>
            Gửi 
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
