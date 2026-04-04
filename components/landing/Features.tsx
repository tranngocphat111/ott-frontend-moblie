import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MessageCircle, Phone, Video, Shield } from 'lucide-react-native';

interface Feature {
  icon: any;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: MessageCircle,
    title: 'Nhắn tin nhanh',
    description: 'Gửi tin nhắn, hình ảnh và video một cách dễ dàng',
  },
  {
    icon: Phone,
    title: 'Gọi điện miễn phí',
    description: 'Gọi thoại chất lượng cao hoàn toàn miễn phí',
  },
  {
    icon: Video,
    title: 'Gọi video',
    description: 'Gặp mặt trực tuyến với bạn bè và gia đình',
  },
  {
    icon: Shield,
    title: 'Bảo mật tối đa',
    description: 'Mã hóa đầu cuối bảo vệ thông tin của bạn',
  },
];

export const Features: React.FC = () => {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="py-12 px-6">
        <Text className="text-3xl font-bold text-center mb-2">Tính năng nổi bật</Text>
        <Text className="text-gray-600 text-center mb-8">
          Trải nghiệm giao tiếp hiện đại
        </Text>

        <View className="space-y-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm flex-row items-start"
              >
                <View className="bg-purple-100 rounded-full p-3 mr-4">
                  <Icon size={24} color="#764ba2" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold mb-1">{feature.title}</Text>
                  <Text className="text-gray-600">{feature.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};
