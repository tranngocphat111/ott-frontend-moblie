import React from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AdvancedSearchModalProps {
  visible: boolean;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  activeTab: 'messages' | 'files' | 'links' | 'media';
  onTabChange: (tab: 'messages' | 'files' | 'links' | 'media') => void;
  items: any[];
  onClose: () => void;
  onOpenResult: (item: any) => void;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  visible,
  keyword,
  onKeywordChange,
  onSearch,
  loading,
  activeTab,
  onTabChange,
  items,
  onClose,
  onOpenResult,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#f3f4f8]">
        <LinearGradient colors={['#1d84f2', '#1ca6e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="px-4 pb-4 pt-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[20px] font-bold text-white">Tìm kiếm nâng cao</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Feather name="x" size={17} color="#fff" />
            </Pressable>
          </View>
          <View className="flex-row items-center rounded-2xl bg-white/15 px-3 py-2.5">
            <Feather name="search" size={18} color="#fff" />
            <TextInput
              value={keyword}
              onChangeText={onKeywordChange}
              placeholder="Tìm theo tin nhắn, file, link..."
              placeholderTextColor="#dbeafe"
              className="ml-2 flex-1 text-[15px] text-white"
            />
            <Pressable onPress={onSearch} className="rounded-full bg-white px-3 py-1.5">
              <Text className="text-[12px] font-semibold text-[#1d84f2]">Tìm</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View className="bg-white px-4 py-2 border-b border-slate-200">
          <View className="flex-row gap-2">
            {[
              { key: 'messages', label: 'Tin nhắn' },
              { key: 'files', label: 'Tệp' },
              { key: 'links', label: 'Link' },
              { key: 'media', label: 'Media' },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => onTabChange(tab.key as 'messages' | 'files' | 'links' | 'media')}
                className={`rounded-full px-3 py-1.5 ${activeTab === tab.key ? 'bg-[#1d84f2]' : 'bg-slate-100'}`}
              >
                <Text className={`text-[12px] font-semibold ${activeTab === tab.key ? 'text-white' : 'text-slate-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-[14px] text-slate-500">Đang tìm kiếm...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item: any, index) => String(item?._id || item?.msg_id || item?.conversation_id || index)}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListEmptyComponent={<Text className="pt-14 text-center text-[14px] text-slate-500">Chưa có kết quả</Text>}
            renderItem={({ item }: { item: any }) => {
              const preview =
                item?.content?.[0]?.text ||
                item?.content?.[0]?.url ||
                item?.content?.[0] ||
                item?.links?.[0] ||
                '[Nội dung]';

              return (
                <Pressable onPress={() => onOpenResult(item)} className="mb-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <Text className="text-[12px] text-slate-500">{item?.sender_name || item?.sender_id || 'Kết quả tìm kiếm'}</Text>
                  <Text className="mt-1 text-[14px] text-slate-900" numberOfLines={2}>{String(preview)}</Text>
                  {item?.conversation_id && (
                    <Text className="mt-1 text-[11px] text-slate-400">Hội thoại: {String(item.conversation_id)}</Text>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
