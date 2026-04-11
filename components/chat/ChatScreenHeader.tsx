import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type ChatScreenHeaderProps = {
  title: string;
  subtitle?: string;
  accentStart: string;
  accentEnd: string;
  onBack: () => void;
  onPhone?: () => void;
  onVideo?: () => void;
  onMenu?: () => void;
};

export const ChatScreenHeader: React.FC<ChatScreenHeaderProps> = ({
  title,
  subtitle = 'Hoat động gần đây',
  accentStart,
  accentEnd,
  onBack,
  onPhone,
  onVideo,
  onMenu,
}) => {
  return (
    <View
      className="px-6 pb-3"
      style={{
        paddingTop: 12,
        backgroundColor: accentStart,
      }}
    >
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable onPress={onBack} className="h-11 w-10 items-center justify-center">
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>

        <View className="mx-1 flex-1 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-[16px] font-bold text-white" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-[12px] text-white/85" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <Pressable onPress={onPhone} className="h-11 w-10 items-center justify-center">
          <Feather name="phone" size={18} color="#fff" />
        </Pressable>
        <Pressable onPress={onVideo} className="h-11 w-10 items-center justify-center">
          <Feather name="video" size={18} color="#fff" />
        </Pressable>
        <Pressable onPress={onMenu} className="h-11 w-10 items-center justify-center">
          <Feather name="menu" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
};
