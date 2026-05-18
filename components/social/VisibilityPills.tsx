import type { Visibility } from '@/services/api/media.api';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { SOCIAL_COLORS, VISIBILITY_OPTIONS } from './socialTheme';

export function VisibilityPills({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {VISIBILITY_OPTIONS.map((item) => {
        const active = value === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            className="h-9 flex-row items-center rounded-full border px-3"
            style={{
              backgroundColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.chipLight,
              borderColor: active ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.border,
            }}
            activeOpacity={0.82}
            onPress={() => onChange(item.value)}
          >
            <Ionicons name={item.icon} size={14} color={active ? '#fff' : SOCIAL_COLORS.primary} />
            <Text
              className="ml-1.5 text-xs font-bold"
              style={{ color: active ? '#fff' : SOCIAL_COLORS.textMuted }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
