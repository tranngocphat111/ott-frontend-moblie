import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Clipboard,
  Dimensions,
  Share,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ChatApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { THEME_COLORS } from '@/constants/theme';

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
    if (!inviteLink) return;
    try {
      await Share.share({
        title: `Tham gia nhóm ${conversationName}`,
        message: `Bạn được mời tham gia nhóm ${conversationName} trên ứng dụng chat.\nLink tham gia: ${inviteLink}`,
        url: inviteLink,
      });
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Link tham gia nhóm</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('link')}
              style={[styles.tabItem, activeTab === 'link' && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === 'link' && styles.tabTextActive]}>Link mời</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('qr')}
              style={[styles.tabItem, activeTab === 'qr' && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>Mã QR</Text>
            </Pressable>
          </View>

          {activeTab === 'link' ? (
            <View>
              <Text style={styles.description}>
                Chia sẻ link này để mời mọi người tham gia nhóm{'\n'}
                <Text style={styles.boldText}>&quot;{conversationName}&quot;</Text>
              </Text>

              <View style={styles.linkCard}>
                <View style={styles.linkContainer}>
                  {loading ? (
                    <ActivityIndicator size="small" color={THEME_COLORS.primary[600]} />
                  ) : (
                    <Text style={styles.linkText} numberOfLines={1}>
                      {inviteLink || 'Đang tải...'}
                    </Text>
                  )}
                </View>
                <Pressable onPress={handleCopyLink} style={styles.iconButton}>
                  <Feather name="copy" size={18} color={THEME_COLORS.primary[600]} />
                </Pressable>
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  onPress={handleCopyLink}
                  style={[styles.button, styles.primaryButton]}
                >
                  <Feather name="copy" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Sao chép link</Text>
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  style={[styles.button, styles.secondaryButton]}
                >
                  <Feather name="share-2" size={18} color="#64748b" />
                  <Text style={styles.secondaryButtonText}>Chia sẻ</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.qrContainer}>
              <Text style={styles.description}>
                Quét mã QR để tham gia nhóm{'\n'}
                <Text style={styles.boldText}>&quot;{conversationName}&quot;</Text>
              </Text>

              <View style={styles.qrWrapper}>
                {loading ? (
                  <ActivityIndicator size="large" color={THEME_COLORS.primary[600]} />
                ) : inviteLink ? (
                  <QRCode value={inviteLink} size={width * 0.5} />
                ) : (
                  <Text>Lỗi tải QR</Text>
                )}
              </View>

              <Pressable onPress={fetchInviteLink} style={styles.refreshButton}>
                <Feather name="refresh-cw" size={16} color="#64748b" />
                <Text style={styles.refreshText}>Làm mới mã QR</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },
  tabTextActive: {
    color: THEME_COLORS.primary[600],
  },
  description: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  linkCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  linkContainer: {
    flex: 1,
    marginRight: 12,
  },
  linkText: {
    color: THEME_COLORS.primary[600],
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: THEME_COLORS.primary[600],
    elevation: 4,
    shadowColor: THEME_COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrapper: {
    padding: 24,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 32,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  refreshText: {
    marginLeft: 8,
    color: '#64748b',
    fontWeight: '500',
  },
});
