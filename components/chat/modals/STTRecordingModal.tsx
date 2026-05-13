import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, View, Animated } from 'react-native';
import { Mic, Check } from 'lucide-react-native';
import { THEME_COLORS } from '@/constants/theme';

interface STTRecordingModalProps {
  visible: boolean;
  onStop: () => void;
  onCancel: () => void;
  isTranscribing: boolean;
}

export const STTRecordingModal: React.FC<STTRecordingModalProps> = ({
  visible,
  onStop,
  onCancel,
  isTranscribing,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (visible && !isTranscribing) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [visible, isTranscribing]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-[320px] bg-white rounded-[32px] p-8 items-center shadow-2xl">
          <View className="mb-8 relative items-center justify-center">
            <View className="p-6 bg-primary-50 rounded-full z-10">
              <Mic size={40} color={THEME_COLORS.primary[500]} />
            </View>

            {!isTranscribing && (
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.6, 0] }),
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: THEME_COLORS.primary[200],
                }}
              />
            )}
          </View>

          <Text className="text-[22px] font-bold text-slate-800 mb-3 text-center">
            {isTranscribing ? "Đang xử lý..." : "AI đang nghe..."}
          </Text>

          <Text className="text-slate-500 text-center mb-8 px-2 leading-5">
            {isTranscribing
              ? "Vui lòng đợi trong giây lát, AI đang chuyển giọng nói thành văn bản."
              : "Hãy nói rõ nội dung bạn muốn soạn thảo để AI ghi lại chính xác nhất."}
          </Text>

          {!isTranscribing ? (
            <Pressable
              onPress={onStop}
              className="w-full bg-primary-500 py-4 rounded-2xl flex-row items-center justify-center gap-2 active:bg-primary-600 shadow-lg"
            >
              <Check size={20} color="#fff" />
              <Text className="text-white font-bold text-[16px]">Xong, chuyển đổi ngay</Text>
            </Pressable>
          ) : (
            <View className="w-full bg-slate-50 py-4 rounded-2xl items-center border border-slate-100">
              <Text className="text-primary-500 font-bold italic animate-pulse">Vui lòng đợi...</Text>
            </View>
          )}

          {!isTranscribing && (
            <Pressable onPress={onCancel} className="mt-5 p-2">
              <Text className="text-slate-400 font-medium text-[14px]">Hủy bỏ</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};
