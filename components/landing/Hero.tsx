import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      className="flex-1 justify-center items-center px-6"
    >
      <View className="items-center mb-12">
        <Text className="text-white text-5xl font-bold mb-4">OTT</Text>
        <Text className="text-white text-xl font-semibold mb-2">Kết nối mọi lúc, mọi nơi</Text>
        <Text className="text-white/80 text-center text-base">
          Nhắn tin, gọi điện và chia sẻ khoảnh khắc với người thân yêu
        </Text>
      </View>

      <View className="w-64 h-64 mb-12">
        <Image
          source={require('../../assets/images/adaptive-icon.png')}
          className="w-full h-full"
          resizeMode="contain"
        />
      </View>

      <View className="w-full space-y-4">
        <TouchableOpacity
          onPress={onGetStarted}
          className="bg-white rounded-full py-4 px-8 shadow-lg"
        >
          <Text className="text-purple-600 text-center text-lg font-bold">
            Bắt đầu ngay
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center items-center space-x-2">
          <View className="h-2 w-2 bg-white rounded-full" />
          <View className="h-2 w-2 bg-white/50 rounded-full" />
          <View className="h-2 w-2 bg-white/50 rounded-full" />
        </View>
      </View>
    </LinearGradient>
  );
};
