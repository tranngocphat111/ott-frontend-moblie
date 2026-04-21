import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UserPlus, Check, X, Clock } from 'lucide-react-native';
import { ChatApi } from '@/services/api/chat';
import { resolveMediaUrl } from '@/utils/chat';
import { useAuth } from '@/context/Authcontext';
import { THEME_COLORS } from '@/constants/theme';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ visible, onClose }) => {
  const { chatUserId } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [relationship, setRelationship] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError('');
    setSearchResult(null);
    setRelationship(null);
    Keyboard.dismiss();

    try {
      const user = await ChatApi.getUserByPhone(phoneNumber.trim());
      if (user) {
        setSearchResult(user);
        if (chatUserId && user.user_id) {
          const rel = await ChatApi.fetchRelationshipStatus(chatUserId, user.user_id);
          setRelationship(rel);
        }
      } else {
        setError('Không tìm thấy người dùng với số điện thoại này.');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi tìm kiếm.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!chatUserId || !searchResult?.user_id) return;
    setLoading(true);
    try {
      const result = await ChatApi.sendFriendRequest(chatUserId, searchResult.user_id);
      if (result) {
        const rel = await ChatApi.fetchRelationshipStatus(chatUserId, searchResult.user_id);
        setRelationship(rel);
        Alert.alert('Thành công', 'Đã gửi lời mời kết bạn.');
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn.');
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipStatus = () => {
    if (!relationship) return 'none';
    return relationship.status;
  };

  const status = getRelationshipStatus();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View className="bg-white rounded-t-3xl p-6 pb-10 min-h-[420px]">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-bold text-slate-900">Thêm bạn mới</Text>
                  <TouchableOpacity onPress={onClose} hitSlop={10}>
                    <X size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center bg-slate-100 rounded-xl px-4 py-1 mb-4">
                  <Feather name="phone" size={18} color="#64748b" />
                  <TextInput
                    className="flex-1 h-12 ml-3 text-[16px]"
                    placeholder="Nhập số điện thoại"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                  />
                  {phoneNumber.length > 0 && (
                    <TouchableOpacity onPress={() => setPhoneNumber('')}>
                      <Feather name="x-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleSearch}
                  disabled={loading || !phoneNumber.trim()}
                  className={`h-12 rounded-xl items-center justify-center ${!phoneNumber.trim() ? 'bg-slate-200' : 'bg-primary-600'
                    }`}
                >
                  {loading && !searchResult ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-[16px]">Tìm kiếm</Text>
                  )}
                </TouchableOpacity>

                {error ? (
                  <Text className="text-red-500 mt-4 text-center">{error}</Text>
                ) : null}

                {searchResult && (
                  <View className="mt-8 items-center">
                    <Image
                      source={{
                        uri: resolveMediaUrl(searchResult.avatar) || 'https://via.placeholder.com/150',
                      }}
                      className="w-24 h-24 rounded-full bg-slate-200 mb-4"
                    />
                    <Text className="text-lg font-bold text-slate-900">{searchResult.name}</Text>
                    <Text className="text-slate-500 mb-6">{searchResult.phone}</Text>

                    {String(searchResult.user_id) === String(chatUserId) ? (
                      <View className="flex-row items-center bg-slate-100 px-4 py-2 rounded-full">
                        <Text className="text-slate-600 font-semibold">Đây là bạn</Text>
                      </View>
                    ) : status?.toUpperCase() === 'ACCEPTED' ? (
                      <View className="flex-row items-center bg-green-50 px-4 py-2 rounded-full">
                        <Check size={18} color="#16a34a" />
                        <Text className="ml-2 text-green-700 font-semibold">Bạn bè</Text>
                      </View>
                    ) : status?.toUpperCase() === 'PENDING' ? (
                      <View className="flex-row items-center bg-primary-50 px-4 py-2 rounded-full">
                        <Clock size={18} color={THEME_COLORS.primary[600]} />
                        <Text className="ml-2 text-primary-700 font-semibold">Đã gửi yêu cầu</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={handleSendRequest}
                        disabled={loading}
                        className="flex-row items-center bg-primary-600 px-6 py-3 rounded-full"
                      >
                        {loading ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <>
                            <UserPlus size={20} color="white" />
                            <Text className="ml-2 text-white font-bold">Kết bạn</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
