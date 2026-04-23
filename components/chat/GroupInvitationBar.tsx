import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Users, Check, X } from 'lucide-react-native';
import { ChatApi } from '@/services/api/chat';
import { THEME_COLORS } from '@/constants/theme';

interface GroupInvitationBarProps {
  conversationId: string;
  userId: string;
  onStatusChange: () => void;
}

export const GroupInvitationBar: React.FC<GroupInvitationBarProps> = ({ 
  conversationId, 
  userId,
  onStatusChange 
}) => {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await ChatApi.acceptInvitation(conversationId, userId);
      onStatusChange();
    } catch (error) {
      console.error('Accept group invitation failed', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời tham gia nhóm.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await ChatApi.rejectInvitation(conversationId, userId);
      onStatusChange();
    } catch (error) {
      console.error('Reject group invitation failed', error);
      Alert.alert('Lỗi', 'Không thể từ chối lời mời tham gia nhóm.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-primary-50 border-b border-primary-100 px-4 py-3 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center">
          <Users size={18} color={THEME_COLORS.primary[600]} />
        </View>
        <Text className="text-[13px] font-medium text-slate-800 flex-1 ml-2">
          Bạn được mời tham gia nhóm này.
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={handleReject}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg"
        >
          <Text className="text-[13px] font-semibold text-slate-500">Từ chối</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAccept}
          disabled={loading}
          className="bg-primary-600 px-4 py-1.5 rounded-lg flex-row items-center justify-center"
          style={{ minWidth: 80 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={14} color="#ffffff" className="mr-1" />
              <Text className="text-[13px] font-semibold text-white ml-1">Chấp nhận</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
