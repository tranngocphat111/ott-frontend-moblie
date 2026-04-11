import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

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
  collapsedHeight?: number;
  expandedHeight?: number;
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
  collapsedHeight = 360,
  expandedHeight = 472,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const mediaHorizontalPadding = 12;
  const mediaGap = 6;
  const mediaTileSize = Math.floor((windowWidth - mediaHorizontalPadding * 2 - mediaGap * 2) / 3);
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(collapsedHeight)).current;
  const lastScrollOffsetRef = useRef(0);
  const expandedRef = useRef(false);
  const animatingRef = useRef(false);

  const animateHeight = useCallback((nextExpanded: boolean) => {
    animatingRef.current = true;
    Animated.spring(heightAnim, {
      toValue: nextExpanded ? expandedHeight : collapsedHeight,
      damping: 22,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: false,
    }).start(() => {
      animatingRef.current = false;
    });
  }, [collapsedHeight, expandedHeight, heightAnim]);

  const setPanelExpanded = useCallback((nextExpanded: boolean) => {
    if (expandedRef.current === nextExpanded || animatingRef.current) return;
    expandedRef.current = nextExpanded;
    setExpanded(nextExpanded);
    animateHeight(nextExpanded);
  }, [animateHeight]);

  useEffect(() => {
    if (!visible) {
      expandedRef.current = false;
      lastScrollOffsetRef.current = 0;
      setExpanded(false);
      heightAnim.setValue(collapsedHeight);
    }
  }, [collapsedHeight, heightAnim, visible]);

  if (!visible) return null;

  const selectedCount = selectedMediaIds.length;

  return (
    <Animated.View style={{ height: heightAnim }} className="border-t border-slate-200 bg-white">
      <View className="h-12 flex-row items-center justify-between px-3">
        {selectedCount > 0 ? (
          <Pressable onPress={onClearSelection} className="h-9 w-9 items-center justify-center">
            <Feather name="chevron-left" size={24} color="#334155" />
          </Pressable>
        ) : (
          <View className="h-9 w-9" />
        )}

        {selectedCount > 0 ? (
          <Pressable onPress={onClearSelection} className="rounded-full border border-slate-300 px-4 py-1">
            <Text className="text-[15px] font-medium text-slate-700">HD {selectedCount} x</Text>
          </Pressable>
        ) : (
          <View className="rounded-full border border-slate-300 px-4 py-1">
            <Text className="text-[15px] font-medium text-slate-700">HD</Text>
          </View>
        )}

        {selectedCount > 0 ? (
          <Pressable disabled={selectedCount === 0} onPress={onSendSelected} className="h-9 w-9 items-center justify-center">
            <Feather name="send" size={26} color={accentColor} />
          </Pressable>
        ) : (
          <View className="h-9 w-9" />
        )}
      </View>

      <View className="px-4 pb-2 pt-1">
        <Text className="text-[13px] font-semibold text-slate-700">Ảnh và video gần đây</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: mediaHorizontalPadding, paddingBottom: 18 }}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const deltaY = offsetY - lastScrollOffsetRef.current;
          lastScrollOffsetRef.current = offsetY;

          if (offsetY > 12 && deltaY > 6 && !expandedRef.current) {
            setPanelExpanded(true);
          }

          if (offsetY <= 8 && deltaY < -6 && expandedRef.current) {
            setPanelExpanded(false);
          }
        }}
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

          {(expanded ? mediaAssets : mediaAssets.slice(0, 11)).map((asset, index) => {
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
                <Image source={{ uri: asset.uri }} className="h-full w-full" resizeMode="cover" />
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
    </Animated.View>
  );
};
