import React from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';

export type ChatPanelMediaAsset = {
  id: string;
  mediaType: MediaLibrary.MediaTypeValue;
  filename?: string;
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
};

type ChatMediaGridItem =
  | { id: '__camera__'; kind: 'camera' }
  | { id: '__video_camera__'; kind: 'video_camera' }
  | { id: '__library__'; kind: 'library' }
  | { id: string; kind: 'asset'; asset: ChatPanelMediaAsset };

type Props = {
  visible: boolean;
  accentColor: string;
  selectedMediaIds: string[];
  mediaAssets: ChatPanelMediaAsset[];
  mediaLoading: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  onOpenLibrary?: () => void;
  onToggleSelectMedia: (assetId: string) => void;
  onClearSelection: () => void;
  onSendSelected: () => void;
  height?: number;
};

export const ChatMediaPanel: React.FC<Props> = ({
  visible,
  accentColor,
  selectedMediaIds,
  mediaAssets,
  mediaLoading,
  onClose,
  onTakePhoto,
  onRecordVideo,
  onOpenLibrary,
  onToggleSelectMedia,
  onClearSelection,
  onSendSelected,
  height = 360,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const mediaHorizontalPadding = 12;
  const mediaGap = 6;
  const mediaTileSize = Math.floor((windowWidth - mediaHorizontalPadding * 2 - mediaGap * 2) / 3);
  const gridData: ChatMediaGridItem[] = [
    { id: '__camera__', kind: 'camera' },
    { id: '__video_camera__', kind: 'video_camera' },
    { id: '__library__', kind: 'library' },
    ...mediaAssets.map((asset) => ({ id: asset.id, kind: 'asset' as const, asset })),
  ];

  if (!visible) return null;

  return (
    <View style={{ height }} className="border-t border-slate-200 bg-white">
      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={3}
        removeClippedSubviews
        initialNumToRender={18}
        windowSize={8}
        maxToRenderPerBatch={24}
        updateCellsBatchingPeriod={40}
        contentContainerStyle={{ paddingHorizontal: mediaHorizontalPadding, paddingBottom: 18, paddingTop: 4 }}
        columnWrapperStyle={{ gap: mediaGap }}
        ListFooterComponent={
          mediaLoading ? (
            <Text className="px-2 pt-2 text-[13px] text-slate-500">Đang tải thư viện...</Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          if (item.kind === 'camera') {
            return (
              <Pressable
                onPress={onTakePhoto}
                style={{
                  width: mediaTileSize,
                  height: mediaTileSize,
                  marginBottom: mediaGap,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="camera" size={22} color="#334155" />
                <Text className="mt-2 text-[13px] text-slate-700">Chụp ảnh</Text>
              </Pressable>
            );
          }

          if (item.kind === 'video_camera') {
            return (
              <Pressable
                onPress={onRecordVideo}
                style={{
                  width: mediaTileSize,
                  height: mediaTileSize,
                  marginBottom: mediaGap,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="video" size={22} color="#334155" />
                <Text className="mt-2 text-[13px] text-slate-700">Quay video</Text>
              </Pressable>
            );
          }

          if (item.kind === 'library') {
            return (
              <Pressable
                onPress={onOpenLibrary}
                style={{
                  width: mediaTileSize,
                  height: mediaTileSize,
                  marginBottom: mediaGap,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#d8b79a',
                  backgroundColor: '#fff7ed',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="image" size={22} color={accentColor} />
                <Text className="mt-2 text-[13px] font-semibold text-slate-700">Thư viện</Text>
              </Pressable>
            );
          }

          const asset = item.asset;
          const selectedOrder = selectedMediaIds.indexOf(asset.id);

          return (
            <Pressable
              onPress={() => onToggleSelectMedia(asset.id)}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                width: mediaTileSize,
                height: mediaTileSize,
                marginBottom: mediaGap,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
              }}
            >
              <Image
                source={{ uri: asset.thumbnailUri || asset.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={80}
              />
              {asset.mediaType === 'video' && (
                <View className="absolute inset-0 items-center justify-center bg-black/25">
                  <Feather name="play-circle" size={24} color="#fff" />
                </View>
              )}
              <View
                className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full border-2"
                style={selectedOrder >= 0 ? { borderColor: accentColor, backgroundColor: accentColor } : { borderColor: '#ffffff', backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                {selectedOrder >= 0 ? (
                  <Text className="text-[12px] font-bold text-white">{selectedOrder + 1}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
};
