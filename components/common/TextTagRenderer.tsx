import React from 'react';
import { Text, StyleSheet, type TextStyle } from 'react-native';
import { THEME_COLORS } from '@/constants/theme';
import { useRouter } from 'expo-router';

interface Props {
  content?: string | null;
  style?: TextStyle | TextStyle[];
  tagStyle?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

export default function TextTagRenderer({
  content,
  style,
  numberOfLines,
}: Props) {
  if (!content) return null;
  return <Text style={style} numberOfLines={numberOfLines}>{content}</Text>;
}
