import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';

export type ChatPanelMediaAsset = {
  id: string;
  mediaType: MediaLibrary.MediaTypeValue;
  filename?: string;
  uri: string;
};

type Props = {
  visible: boolean;
  accentColor: string;
  selectedMediaIds: string[];
  mediaAssets: ChatPanelMediaAsset[];
  mediaLoading: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
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
  onToggleSelectMedia,
  onClearSelection,
  onSendSelected,
  height = 360,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const mediaHorizontalPadding = 12;
  const mediaGap = 6;
  const mediaTileSize = Math.floor((windowWidth - mediaHorizontalPadding * 2 - mediaGap * 2) / 3);

  if (!visible) return null;

  const selectedCount = selectedMediaIds.length;

  return (
    <View style={{ height }} className="border-t border-slate-200 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: mediaHorizontalPadding, paddingBottom: 18 }}
        scrollEventThrottle={16}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Pressable
            onPress={onTakePhoto}
            style={{
              width: mediaTileSize,
              height: mediaTileSize,
              marginBottom: mediaGap,
              marginRight: mediaGap,
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

          {mediaAssets.map((asset, index) => {
            const overallIndex = index + 1;
            const isLastColumn = overallIndex % 3 === 2;
            const selectedOrder = selectedMediaIds.indexOf(asset.id);

            return (
              <Pressable
                key={asset.id}
                onPress={() => onToggleSelectMedia(asset.id)}
                style={{
                  width: mediaTileSize,
                  height: mediaTileSize,
                  marginBottom: mediaGap,
                  marginRight: isLastColumn ? 0 : mediaGap,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9',
                }}
              >
                <Image source={{ uri: asset.uri }} className="h-full w-full" contentFit="cover" transition={120} />
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
          })}
        </View>

        {mediaLoading && (
          <Text className="px-2 pt-2 text-[13px] text-slate-500">Đang tải thư viện...</Text>
        )}
      </ScrollView>
    </View>
  );
};
