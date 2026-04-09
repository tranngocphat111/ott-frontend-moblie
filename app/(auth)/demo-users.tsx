import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { UserCircle2, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/context/Authcontext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatApi } from '@/services/api';
import type { ChatServiceUser } from '@/services/api/chat.api';

const DemoUserSelector: React.FC = () => {
  const router = useRouter();
  const { user: currentUser, chatUserId, setChatUserId } = useAuth();
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(chatUserId);
  const [users, setUsers] = useState<ChatServiceUser[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const response = await ChatApi.getAllUsers();
        setUsers(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to load chat users:', error);
        Alert.alert('Lỗi', 'Không tải được danh sách user từ chat-service');
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const handleSelectUser = async (userId: string) => {
    try {
      setLoading(true);
      const selectedUser = users.find((u) => u.user_id === userId);
      if (!selectedUser) {
        Alert.alert('Lỗi', 'Không tìm thấy user');
        setLoading(false);
        return;
      }

      // Set chat user ID (for fetching chat data)
      await setChatUserId(userId);
      setSelectedChatUserId(userId);

      // Show confirmation
      Alert.alert('Thành công', `Đã chọn user MongoDB: ${selectedUser.name || selectedUser.user_id}`, [
        {
          text: 'Quay lại',
          onPress: () => {
            setLoading(false);
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error selecting user:', error);
      Alert.alert('Lỗi', 'Không thể chọn user này');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('mockChatUserId');
      setSelectedChatUserId(null);
      Alert.alert('Thành công', 'Đã xóa user MongoDB mô phỏng');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xóa user mô phỏng');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="mb-8">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
              <UserCircle2 size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">Chế độ Demo</Text>
              <Text className="text-sm text-gray-600">Chọn user để test mà không cần user-service</Text>
            </View>
          </View>
        </View>

        {/* Current User & Chat User Info */}
        {currentUser && (
          <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
            <Text className="text-xs text-blue-600 font-semibold mb-1">TÀI KHOẢN ĐĂNG NHẬP</Text>
            <Text className="text-sm text-gray-700 font-medium">{currentUser.fullName}</Text>
            <Text className="text-xs text-gray-500 mt-1">{currentUser.phone}</Text>
          </View>
        )}

        {selectedChatUserId && (
          <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6">
            <Text className="text-xs text-indigo-600 font-semibold mb-1">USER MONGODB (CHAT DATA)</Text>
            <Text className="text-sm text-gray-700 font-medium">
              {users.find((u) => u.user_id === selectedChatUserId)?.name || selectedChatUserId}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">ID: {selectedChatUserId}</Text>
          </View>
        )}

        {/* User List */}
        <Text className="text-sm font-semibold text-gray-700 mb-3">Chọn user MongoDB</Text>

        <View className="bg-white rounded-2xl overflow-hidden border border-gray-200">
          {users.map((user, idx) => {
            const isSelected = selectedChatUserId === user.user_id;
            return (
              <TouchableOpacity
                key={user._id || user.user_id}
                onPress={() => handleSelectUser(user.user_id)}
                disabled={loading}
                className={`flex-row items-center px-4 py-4 ${
                  idx < users.length - 1 ? 'border-b border-gray-100' : ''
                } ${isSelected ? 'bg-indigo-50' : 'bg-white'}`}
              >
                {/* Avatar */}
                <View className="mr-4">
                  {user.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      className="w-12 h-12 rounded-full bg-gray-200"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <UserCircle2 size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                {/* User Info */}
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-indigo-900' : 'text-gray-900'
                    }`}
                  >
                    {user.name || user.user_id}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{user.user_id}</Text>
                </View>

                {/* Selector */}
                <View className="flex-row items-center">
                  {isSelected && <View className="w-2 h-2 bg-indigo-500 rounded-full mr-3" />}
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Section */}
        <View className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Text className="text-xs font-bold text-blue-900 mb-2">ℹ️ THÔNG TIN</Text>
          <Text className="text-xs text-blue-800 leading-5">
            Chế độ này cho phép bạn test các tính năng chat bằng dữ liệu người dùng thật từ chat-service
            (MongoDB), không phụ thuộc user-service.
          </Text>
        </View>

        {selectedChatUserId && (
          <TouchableOpacity
            onPress={handleLogout}
            className="mt-6 px-4 py-3 bg-red-100 rounded-xl border border-red-300"
          >
            <Text className="text-sm font-semibold text-red-700 text-center">Xóa chế độ demo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {loading && (
        <View className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </SafeAreaView>
  );
};

export default DemoUserSelector;
