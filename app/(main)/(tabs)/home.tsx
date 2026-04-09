import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/Authcontext';

// Mock data
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

  const renderConversationItem = ({ item }: { item: typeof conversations[0] }) => (
    <TouchableOpacity
      className="flex-row px-4 py-3 border-b border-gray-100 dark:border-gray-800"
      activeOpacity={0.7}
    >
      {/* Avatar with online indicator */}
      <View className="relative mr-3">
        <Image 
          source={{ uri: item.avatar }} 
          className="w-14 h-14 rounded-full" 
        />
        {item.online && (
          <View className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
        )}
      </View>

      {/* Content */}
      <View className="flex-1 justify-center">
        {/* Header: Name & Time */}
        <View className="flex-row justify-between items-center mb-1">
          <Text className="flex-1 text-base font-semibold text-gray-900 dark:text-white mr-2" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {item.time}
          </Text>
        </View>

        {/* Footer: Message & Unread badge */}
        <View className="flex-row justify-between items-center">
          <Text
            className="flex-1 text-sm text-gray-600 dark:text-gray-400 mr-2"
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View className="min-w-[20px] h-5 rounded-full bg-primary justify-center items-center px-1.5">
              <Text className="text-white text-xs font-bold">{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Tin nhắn
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity className="p-1">
            <Ionicons name="search" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity className="p-1">
            <Ionicons name="add-circle-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center mx-4 my-3 px-3 py-2 bg-gray-100 dark:bg-dark-card rounded-full gap-2">
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          className="flex-1 text-base text-gray-900 dark:text-white py-1"
          placeholder="Tìm kiếm"
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-4"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}