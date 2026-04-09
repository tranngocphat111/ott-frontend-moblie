import { useAuth } from '@/context/Authcontext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const conversations = [
  {
    id: '1',
    name: 'Nguyễn Văn A',
    avatar: 'https://i.pravatar.cc/150?img=1',
    lastMessage: 'Chào bạn, hẹn gặp lại nhé!',
    time: '10:30',
    unread: 2,
    online: true,
  },
  {
    id: '2',
    name: 'Trần Thị B',
    avatar: 'https://i.pravatar.cc/150?img=2',
    lastMessage: 'Đã gửi một ảnh',
    time: 'Hôm qua',
    unread: 0,
    online: false,
  },
  {
    id: '3',
    name: 'Nhóm Công Việc',
    avatar: 'https://i.pravatar.cc/150?img=3',
    lastMessage: 'Mai họp lúc 9h nhé mọi người',
    time: '2 ngày',
    unread: 5,
    online: false,
    isGroup: true,
  },
  {
    id: '4',
    name: 'Lê Văn C',
    avatar: 'https://i.pravatar.cc/150?img=4',
    lastMessage: 'OK bạn, cảm ơn nhiều!',
    time: '3 ngày',
    unread: 0,
    online: true,
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');

  const renderConversationItem = ({ item }: { item: (typeof conversations)[0] }) => (
    <TouchableOpacity
      className="flex-row mx-4 mb-2 px-4 py-3.5 rounded-2xl bg-surface-raised border border-brand-100"
      activeOpacity={0.85}
    >
      <View className="relative mr-3">
        <Image source={{ uri: item.avatar }} className="w-14 h-14 rounded-full" />
        {item.online && (
          <View className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
        )}
      </View>

      <View className="flex-1 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="flex-1 text-base font-semibold text-brand-900 mr-2" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-brand-500">{item.time}</Text>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="flex-1 text-sm text-brand-600 mr-2" numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View className="min-w-[22px] h-[22px] rounded-full bg-brand-600 justify-center items-center px-1.5">
              <Text className="text-white text-xs font-bold">{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={['top']}>
      <View className="px-4 py-3">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-xs text-brand-500">Xin chào</Text>
            <Text className="text-2xl font-bold text-brand-900">{user?.fullName || 'Tin nhắn'}</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity className="w-10 h-10 rounded-xl bg-surface-raised border border-brand-100 items-center justify-center">
              <Ionicons name="search" size={20} color="#694d31" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 rounded-xl bg-brand-600 items-center justify-center">
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center px-3 py-2.5 bg-surface-raised rounded-2xl border border-brand-100 gap-2">
          <Ionicons name="search" size={18} color="#8b6642" />
          <TextInput
            className="flex-1 text-base text-brand-900 py-1"
            placeholder="Tìm kiếm cuộc trò chuyện"
            placeholderTextColor="#bc9166"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#bc9166" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={item => item.id}
        contentContainerClassName="pb-5"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
