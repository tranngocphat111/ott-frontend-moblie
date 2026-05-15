import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { UserPlus, Check, X, Clock } from 'lucide-react-native';
import { ChatApi } from '@/services/api/chat';
import { THEME_COLORS } from '@/constants/theme';

interface FriendRequestBarProps {
  relationship: any;
  conversation: any;
  currentUserId: string;
  onStatusChange: () => void;
}

export const FriendRequestBar: React.FC<FriendRequestBarProps> = ({ 
  relationship, 
  conversation,
  currentUserId,
  onStatusChange 
}) => {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!relationship?._id) return;
    setLoading(true);
    const success = await ChatApi.acceptFriendRequest(relationship._id);
    if (success) {
      onStatusChange();
    } else {
      console.error('Accept friend request failed');
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!relationship?._id) return;
    setLoading(true);
    const success = await ChatApi.rejectFriendRequest(relationship._id);
    if (success) {
      onStatusChange();
    } else {
      console.error('Reject friend request failed');
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!relationship?._id) return;
    setLoading(true);
    const success = await ChatApi.cancelFriendRequest(relationship._id);
    if (success) {
      onStatusChange();
    } else {
      console.error('Cancel friend request failed');
    }
    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (conversation?.type !== 'private' || !currentUserId) return;
    const otherParticipantId = conversation.participants?.find((p: any) => String(p.user_id) !== String(currentUserId))?.user_id;
    if (!otherParticipantId) return;

    setLoading(true);
    const success = await ChatApi.sendFriendRequest(currentUserId, otherParticipantId);
    if (success) {
      onStatusChange();
    } else {
      console.error('Send friend request failed');
    }
    setLoading(false);
  };

  const isIncoming = relationship?.receiver_id === currentUserId;
  const isPending = relationship?.status === 'PENDING';
  const isAccepted = relationship?.status === 'ACCEPTED';

  if (isPending && isIncoming) {
    return (
      <View className="bg-primary-50 border-b border-primary-100 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center">
            <UserPlus size={18} color={THEME_COLORS.primary[600]} />
          </View>
          <Text className="text-[13px] font-medium text-slate-800 flex-1 ml-2">
            Người này đã gửi lời mời kết bạn.
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
                <Check size={14} color="#ffffff" />
                <Text className="text-[13px] font-semibold text-white ml-1">Chấp nhận</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isPending && !isIncoming) {
    // Outgoing
    return (
      <View className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
            <Clock size={18} color="#64748b" />
          </View>
          <Text className="text-[13px] font-medium text-slate-800 flex-1 ml-2">
            Đã gửi lời mời kết bạn.
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCancel}
          disabled={loading}
          className="px-4 py-1.5 rounded-lg flex-row items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text className="text-[13px] font-semibold text-red-600">Hủy</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Not friends
  if (!isAccepted) {
    return (
      <View className="bg-[#fff9f4] border-b border-[#ead8c7] px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-8 h-8 bg-[#efe3d7] rounded-full items-center justify-center">
            <UserPlus size={18} color="#b78457" />
          </View>
          <Text className="text-[13px] font-medium text-slate-800 flex-1 ml-2">
            Hai bạn chưa là bạn bè.
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSendRequest}
          disabled={loading}
          className="bg-[#b78457] px-4 py-1.5 rounded-lg flex-row items-center justify-center"
          style={{ minWidth: 100 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <UserPlus size={14} color="#ffffff" />
              <Text className="text-[13px] font-semibold text-white ml-1">Gửi lời mời</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};
