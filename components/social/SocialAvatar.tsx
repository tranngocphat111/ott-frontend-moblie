import { THEME_COLORS } from '@/constants/theme';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';
import { initialsFor } from './socialTheme';

export function Avatar({
  uri,
  name,
  size = 44,
  color = THEME_COLORS.primary[500],
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  color?: string;
}) {
  return (
    <View
      className="overflow-hidden rounded-full items-center justify-center"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {uri ? (
        <ExpoImage source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text className="text-white font-bold" style={{ fontSize: Math.max(13, Math.round(size * 0.36)) }}>
          {initialsFor(name)}
        </Text>
      )}
    </View>
  );
}
