import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ChatApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { ForwardMessageModal } from './ForwardMessageModal';
import type { ChatConversationWithParticipant, ChatMessage } from '@/types/entities/chat';

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  conversationName: string;
  currentUserId: string;
}

const { width } = Dimensions.get('window');

export const GroupInviteLinkModal: React.FC<Props> = ({
  visible,
  onClose,
  conversationId,
  conversationName,
  currentUserId,
}) => {
  const { showToast } = useToast();
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');
  const [showForward, setShowForward] = useState(false);
  const [conversations, setConversations] = useState<ChatConversationWithParticipant[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const fetchInviteLink = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    setLoading(true);
    try {
      const link = await ChatApi.getInviteLink(conversationId, currentUserId);
      setInviteLink(link);
    } catch (error) {
      console.error('Error fetching invite link:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (visible) {
      void fetchInviteLink();
    }
  }, [visible, fetchInviteLink]);

  const handleCopyLink = () => {
    if (!inviteLink) return;
    Clipboard.setString(inviteLink);
    showToast('Đã sao chép link tham gia nhóm!', 'success');
  };

  const handleShare = async () => {
    if (!inviteLink || !currentUserId) return;
    try {
      setLoading(true);
      const convs = await ChatApi.getUserConversations(currentUserId);
      setConversations(convs);
      setShowForward(true);
    } catch (error) {
      showToast('Lỗi khi tải danh sách hội thoại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmForward = async (conversationIds: string[]) => {
    if (!inviteLink || !currentUserId) return;
    setIsForwarding(true);
    try {
      for (const cid of conversationIds) {
        await ChatApi.sendMessage({
          conversationId: cid,
          senderId: currentUserId,
          content: inviteLink,
          type: 'link'
        });
      }
      showToast(`Đã chia sẻ link cho ${conversationIds.length} hội thoại!`, 'success');
      setShowForward(false);
      onClose();
    } catch (error) {
      showToast('Lỗi khi chia sẻ link', 'error');
    } finally {
      setIsForwarding(false);
    }
  };

  const dummyMessage = useMemo(() => {
    return {
      _id: 'dummy',
      conversation_id: '',
      sender_id: currentUserId,
      content: [inviteLink],
      type: 'link',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
  }, [inviteLink, currentUserId]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[32px] px-6 pt-6 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-[20px] font-bold text-slate-900">Link tham gia nhóm</Text>
            <Pressable onPress={onClose} className="p-2 bg-slate-100 rounded-full">
              <Feather name="x" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Tab Bar */}
          <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-6">
            <Pressable
              onPress={() => setActiveTab('link')}
              className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'link' ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-[14px] font-bold ${activeTab === 'link' ? 'text-primary-600' : 'text-slate-500'}`}>Link mời</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('qr')}
              className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'qr' ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-[14px] font-bold ${activeTab === 'qr' ? 'text-primary-600' : 'text-slate-500'}`}>Mã QR</Text>
            </Pressable>
          </View>

          {activeTab === 'link' ? (
            <View>
              <Text className="text-center text-slate-500 mb-6 leading-5">
                Chia sẻ link này để mời mọi người tham gia nhóm{'\n'}
                <Text className="font-bold text-slate-800">"{conversationName}"</Text>
              </Text>

              <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 flex-row items-center mb-6">
                <View className="flex-1 mr-3">
                  {loading ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <Text className="text-primary-600 font-medium" numberOfLines={1}>
                      {inviteLink || 'Đang tải...'}
                    </Text>
                  )}
                </View>
                <Pressable onPress={handleCopyLink} className="p-2">
                  <Feather name="copy" size={18} color="#8b5cf6" />
                </Pressable>
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleCopyLink}
                  className="flex-1 bg-primary-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary-500/30"
                >
                  <Feather name="copy" size={18} color="#fff" />
                  <Text className="text-white font-bold ml-2">Sao chép link</Text>
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  className="flex-1 bg-slate-100 py-4 rounded-2xl flex-row items-center justify-center"
                >
                  <Feather name="share-2" size={18} color="#64748b" />
                  <Text className="text-slate-700 font-bold ml-2">Chia sẻ</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-center text-slate-500 mb-8 leading-5">
                Quét mã QR để tham gia nhóm{'\n'}
                <Text className="font-bold text-slate-800">"{conversationName}"</Text>
              </Text>

              <View className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm mb-6">
                {loading ? (
                  <ActivityIndicator size="large" color="#8b5cf6" />
                ) : inviteLink ? (
                  <QRCode value={inviteLink} size={width * 0.5} />
                ) : (
                  <Text>Lỗi tải QR</Text>
                )}
              </View>

              <Pressable onPress={fetchInviteLink} className="flex-row items-center py-2">
                <Feather name="refresh-cw" size={16} color="#64748b" />
                <Text className="ml-2 text-slate-500 font-medium">Làm mới mã QR</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <ForwardMessageModal
        visible={showForward}
        message={dummyMessage}
        conversations={conversations}
        currentConversationId={conversationId}
        currentUserId={currentUserId}
        isSubmitting={isForwarding}
        onClose={() => setShowForward(false)}
        onConfirm={handleConfirmForward}
      />
    </Modal>
  );
};
