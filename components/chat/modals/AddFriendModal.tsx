import React, { useState, useEffect } from 'react';
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
import { UserPlus, Check, X, Clock, UserMinus, UserCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatApi } from '@/services/api/chat';
import { resolveMediaUrl } from '@/utils/chat';
import { useAuth } from '@/context/Authcontext';
import { THEME_COLORS } from '@/constants/theme';
import { chatSocket } from '@/services/socket/chatSocket';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ visible, onClose }) => {
  const { chatUserId } = useAuth();
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [relationship, setRelationship] = useState<any>(null);
  const [error, setError] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Socket listener for relationship updates
  useEffect(() => {
    if (!chatUserId || !visible) return;

    const handleRelationshipUpdate = (updatedRel: any) => {
      // If the update is for the user currently being viewed in searchResult
      if (searchResult && 
          (updatedRel.requester_id === searchResult.user_id || 
           updatedRel.receiver_id === searchResult.user_id)) {
        setRelationship(updatedRel);
      }
    };

    chatSocket.on('cap_nhat_quan_he', handleRelationshipUpdate);
    return () => {
      chatSocket.off('cap_nhat_quan_he', handleRelationshipUpdate);
    };
  }, [chatUserId, searchResult, visible]);

  useEffect(() => {
    if (!visible) {
      setKeyboardOffset(0);
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardHeight = Math.max(0, Number(event.endCoordinates?.height || 0));
      setKeyboardOffset(Math.max(0, keyboardHeight - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, visible]);

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

  const handleAcceptRequest = async () => {
    if (!relationship?._id) return;
    setLoading(true);
    try {
      const success = await ChatApi.acceptFriendRequest(relationship._id);
      if (success) {
        const rel = await ChatApi.fetchRelationshipStatus(chatUserId!, searchResult.user_id);
        setRelationship(rel);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Chấp nhận kết bạn thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!relationship?._id) return;
    setLoading(true);
    try {
      const success = await ChatApi.cancelFriendRequest(relationship._id);
      if (success) {
        const rel = await ChatApi.fetchRelationshipStatus(chatUserId!, searchResult.user_id);
        setRelationship(rel);
        Alert.alert('Thông báo', 'Đã hủy lời mời kết bạn.');
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Hủy lời mời kết bạn thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!chatUserId || !searchResult?.user_id) return;
    Alert.alert(
      'Hủy kết bạn',
      `Bạn có chắc chắn muốn hủy kết bạn với ${searchResult.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đồng ý', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await ChatApi.unfriend(chatUserId, searchResult.user_id);
              if (success) {
                const rel = await ChatApi.fetchRelationshipStatus(chatUserId, searchResult.user_id);
                setRelationship(rel);
              }
            } catch (err) {
              Alert.alert('Lỗi', 'Hủy kết bạn thất bại.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 justify-end"
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                className="bg-white rounded-t-3xl p-6 min-h-[420px]"
                style={{
                  marginBottom: Platform.OS === 'android' ? keyboardOffset : 0,
                  paddingBottom: Math.max(insets.bottom + 24, 34),
                  maxHeight: '88%',
                }}
              >
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
                      <TouchableOpacity
                        onPress={handleUnfriend}
                        disabled={loading}
                        className="flex-row items-center bg-green-50 border border-green-200 px-6 py-2 rounded-full active:bg-green-100"
                      >
                        <Check size={18} color="#16a34a" />
                        <Text className="ml-2 text-green-700 font-semibold mr-1">Bạn bè</Text>
                        <Feather name="chevron-down" size={14} color="#16a34a" />
                      </TouchableOpacity>
                    ) : status?.toUpperCase() === 'PENDING' ? (
                      relationship.receiver_id === chatUserId ? (
                        <TouchableOpacity
                          onPress={handleAcceptRequest}
                          disabled={loading}
                          className="flex-row items-center bg-primary-600 px-8 py-3 rounded-full"
                        >
                          <UserCheck size={20} color="white" />
                          <Text className="ml-2 text-white font-bold text-[16px]">Chấp nhận</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={handleCancelRequest}
                          disabled={loading}
                          className="flex-row items-center bg-primary-50 border border-primary-100 px-6 py-2.5 rounded-full active:bg-primary-100"
                        >
                          <Clock size={18} color={THEME_COLORS.primary[600]} />
                          <Text className="ml-2 text-primary-700 font-semibold">Đã gửi yêu cầu (Hủy)</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <TouchableOpacity
                        onPress={handleSendRequest}
                        disabled={loading}
                        className="flex-row items-center bg-primary-600 px-10 py-3 rounded-full"
                      >
                        {loading ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <>
                            <UserPlus size={20} color="white" />
                            <Text className="ml-2 text-white font-bold text-[16px]">Kết bạn</Text>
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
