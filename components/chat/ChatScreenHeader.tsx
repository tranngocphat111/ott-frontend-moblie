import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_COLORS } from '@/constants/theme';

type ChatScreenHeaderProps = {
  title: string;
  subtitle?: string;
  accentStart: string;
  accentEnd: string;
  topInset?: number;
  onBack: () => void;
  onPhone?: () => void;
  onVideo?: () => void;
  onMenu?: () => void;
  onSummarize?: () => void;
  isOnline?: boolean;
};

export const ChatScreenHeader: React.FC<ChatScreenHeaderProps> = ({
  title,
  subtitle,
  accentStart,
  accentEnd,
  topInset = 0,
  onBack,
  onPhone,
  onVideo,
  onMenu,
  onSummarize,
  isOnline = false,
}) => {
  const subtitleText = subtitle?.trim() || '';
  const hasSubtitle = subtitleText.length > 0;

  return (
    <LinearGradient
        colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 2,
          paddingBottom: 1,
          paddingTop: 40,
        }}
    >
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={onBack} className="h-11 w-10 items-center justify-center">
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>

        <View className="mx-1 flex-1 flex-row items-center gap-3 self-stretch">
          <View className="flex-1 justify-center">
            <Text className="text-[16px] font-bold text-white" numberOfLines={1}>
              {title}
            </Text>
            {hasSubtitle && (
              <View className="mt-0.5 flex-row items-center">
                {isOnline && <View className="mr-1.5 h-2 w-2 rounded-full bg-emerald-300" />}
                <Text className="text-[12px] text-white/85" numberOfLines={1}>
                  {subtitleText}
                </Text>
              </View>
            )}
          </View>
        </View>

        {onPhone && (
          <Pressable onPress={onPhone} className="h-11 w-10 items-center justify-center">
            <Feather name="phone" size={18} color="#fff" />
          </Pressable>
        )}
        {onVideo && (
          <Pressable onPress={onVideo} className="h-11 w-10 items-center justify-center">
            <Feather name="video" size={18} color="#fff" />
          </Pressable>
        )}
        {onSummarize && (
          <Pressable onPress={onSummarize} className="h-11 w-10 items-center justify-center">
            <Sparkles size={18} color="#fff" />
          </Pressable>
        )}
        <Pressable onPress={onMenu} className="h-11 w-10 items-center justify-center">
          <Feather name="menu" size={18} color="#fff" />
        </Pressable>
      </View>
    </LinearGradient>
  );
};
