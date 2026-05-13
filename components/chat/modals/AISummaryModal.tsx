import React from 'react';
import { Modal, Pressable, ScrollView, Text, View, Dimensions } from 'react-native';
import { X, Sparkles, AlertCircle } from 'lucide-react-native';
import { THEME_COLORS } from '@/constants/theme';

interface AISummaryModalProps {
  visible: boolean;
  onClose: () => void;
  summary: string | null;
  loading: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AISummaryModal: React.FC<AISummaryModalProps> = ({
  visible,
  onClose,
  summary,
  loading,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View 
          className="bg-white rounded-t-[32px] overflow-hidden"
          style={{ height: SCREEN_HEIGHT * 0.7 }}
        >
          {/* Header */}
          <View className="px-6 py-5 flex-row items-center justify-between border-b border-slate-100">
            <View className="flex-row items-center gap-2.5">
              <View className="p-2 bg-primary-50 rounded-xl">
                <Sparkles size={20} color={THEME_COLORS.primary[500]} />
              </View>
              <Text className="text-[18px] font-bold text-slate-800">Tóm tắt hội thoại (AI)</Text>
            </View>
            <Pressable onPress={onClose} className="p-2 bg-slate-100 rounded-full">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-6 py-6">
            {loading ? (
              <View className="flex-1 items-center justify-center py-20">
                <View className="animate-spin mb-4">
                  <Sparkles size={40} color={THEME_COLORS.primary[500]} opacity={0.5} />
                </View>
                <Text className="text-slate-500 font-medium">AI đang đọc tin nhắn...</Text>
              </View>
            ) : summary ? (
              <View className="bg-primary-50/30 p-5 rounded-[24px] border border-primary-100/50">
                <Text className="text-[15px] leading-[24px] text-slate-700 font-medium">
                  {summary}
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center py-20">
                <AlertCircle size={40} color="#cbd5e1" />
                <Text className="mt-4 text-slate-400 text-center font-medium">
                  Không có nội dung quan trọng để tóm tắt.
                </Text>
              </View>
            )}
            
            <View className="h-10" />
          </ScrollView>

          {/* Footer */}
          <View className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
            <Pressable 
              onPress={onClose}
              className="w-full bg-primary-500 py-4 rounded-2xl items-center shadow-sm active:opacity-90"
            >
              <Text className="text-white font-bold text-[16px]">Đã hiểu</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
