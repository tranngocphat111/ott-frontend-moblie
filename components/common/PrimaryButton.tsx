// components/common/PrimaryButton.tsx
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { THEME_COLORS } from '@/constants/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const getButtonStyle = () => {
    if (disabled || loading) {
      return 'bg-brand-200 border border-brand-200';
    }

    switch (variant) {
      case 'primary':
        return 'bg-brand-600 border border-brand-600';
      case 'secondary':
        return 'bg-brand-500 border border-brand-500';
      case 'outline':
        return 'bg-white border border-brand-300';
      default:
        return 'bg-brand-600 border border-brand-600';
    }
  };

  const getTextStyle = () => {
    if (disabled || loading) {
      return 'text-brand-600';
    }

    return variant === 'outline' ? 'text-brand-700' : 'text-white';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${getButtonStyle()} rounded-2xl py-4 px-6 flex-row justify-center items-center shadow-soft`}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? THEME_COLORS.primary[600] : THEME_COLORS.neutral.white} />
      ) : (
        <Text className={`${getTextStyle()} text-base font-semibold`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

