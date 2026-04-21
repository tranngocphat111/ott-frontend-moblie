import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';
import { chatMessageApi } from '@/services/api/chat/chat-message.api';
import { useAuth } from '@/context/Authcontext';
import { PollVoterDetailModal } from '../modals/PollVoterDetailModal';

interface ChatPollMessageProps {
  message: ChatMessage;
  isMine: boolean;
  conversation?: ChatConversation | null;
}

export const ChatPollMessage: React.FC<ChatPollMessageProps> = ({ message, isMine, conversation }) => {
  const { chatUserId, user } = useAuth();
  const currentUserId = String(chatUserId || user?.id || '');
  const [voterModalVisible, setVoterModalVisible] = useState(false);

  const totalVoters = useMemo(() => {
    const voters = new Set<string>();
    message.poll_options?.forEach((opt) => {
      opt.voters?.forEach((v) => voters.add(String(v)));
    });
    return voters.size;
  }, [message.poll_options]);

  const handleVote = async (optionId: string) => {
    if (!message.conversation_id || !message.msg_id) return;

    try {
      const currentVotedOptions = message.poll_options
        ?.filter((opt) => opt.voters?.includes(currentUserId))
        .map((opt) => opt.id) || [];

      let newOptionIds: string[];
      if (message.poll_multiple_choice) {
        if (currentVotedOptions.includes(optionId)) {
          newOptionIds = currentVotedOptions.filter((id) => id !== optionId);
        } else {
          newOptionIds = [...currentVotedOptions, optionId];
        }
      } else {
        if (currentVotedOptions.includes(optionId)) {
          newOptionIds = [];
        } else {
          newOptionIds = [optionId];
        }
      }

      await chatMessageApi.votePoll(
        message.conversation_id,
        message.msg_id,
        currentUserId,
        newOptionIds
      );
    } catch (error) {
      console.error('Failed to vote:', error);
      Alert.alert('Lỗi', 'Không thể gửi bình chọn. Vui lòng thử lại.');
    }
  };

  const CHAT_BROWN = '#d2a177';
  const CHAT_BROWN_LIGHT = '#fdf8f4';
  const CHAT_BROWN_BORDER = '#f5e8dc';

  return (
    <View className="my-2 items-center justify-center" style={{ width: 280 }}>
      <View
        className="w-full rounded-[28px] border p-4 shadow-sm"
        style={{ backgroundColor: CHAT_BROWN_LIGHT, borderColor: CHAT_BROWN_BORDER }}
      >
        {/* Poll Header */}
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Feather name="bar-chart-2" size={20} color={CHAT_BROWN} />
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-slate-800" numberOfLines={3}>
              {message.poll_question}
            </Text>
            {message.poll_multiple_choice && (
              <Text className="text-[11px]   tracking-wider text-slate-400 mt-0.5">
                Chọn nhiều đáp án
              </Text>
            )}
          </View>
        </View>

        {/* Poll Options */}
        <View className="w-full gap-3">
          {message.poll_options?.map((option) => {
            const isVoted = option.voters?.includes(currentUserId);
            const voteCount = option.voters?.length || 0;
            const percentage = totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0;

            return (
              <Pressable
                key={option.id}
                onPress={() => handleVote(option.id)}
                className="relative h-14 w-full overflow-hidden rounded-[18px] bg-white border border-slate-100 shadow-sm"
              >
                {/* Progress Bar Background */}
                <View
                  style={{ width: `${percentage}%`, backgroundColor: '#fcf2e8' }}
                  className="absolute bottom-0 left-0 top-0"
                />

                {/* Option Content */}
                <View className="flex-1 flex-row items-center justify-between px-4">
                  <View className="flex-1 flex-row items-center gap-3">
                    <View className={`h-6 w-6 items-center justify-center rounded-full border-2 ${isVoted ? 'bg-[#d2a177]' : 'bg-white'}`} style={{ borderColor: isVoted ? CHAT_BROWN : '#e2e8f0' }}>
                      {isVoted && <Feather name="check" size={14} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text className={`text-[15px] font-medium ${isVoted ? 'text-slate-900 font-bold' : 'text-slate-700'}`} numberOfLines={1}>
                      {option.name}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[14px] font-bold text-slate-800">{voteCount}</Text>
                    {percentage > 0 && (
                      <Text className="text-[10px] font-medium text-slate-400">{Math.round(percentage)}%</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Poll Footer */}
        <Pressable 
          onPress={() => setVoterModalVisible(true)}
          className="mt-5 flex-row items-center justify-between border-t border-slate-100 pt-4 active:opacity-60"
        >
          <View className="flex-row items-center gap-1.5">
            <Feather name="users" size={12} color="#94a3b8" />
            <Text className="text-[12px] font-semibold text-slate-400">
              {totalVoters} người đã bình chọn
            </Text>
          </View>
          <View className="flex-row -space-x-2">
            <View className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 items-center justify-center">
              <Feather name="more-horizontal" size={10} color="#94a3b8" />
            </View>
          </View>
        </Pressable>
      </View>

      <PollVoterDetailModal
        visible={voterModalVisible}
        message={message}
        conversation={conversation}
        onClose={() => setVoterModalVisible(false)}
        currentUserId={currentUserId}
      />
    </View>
  );
};
