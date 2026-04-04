// components/common/PrimaryButton.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

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
      return 'bg-gray-300';
    }
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-gray-600';
      case 'outline':
        return 'bg-white border-2 border-blue-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getTextStyle = () => {
    if (disabled || loading) {
      return 'text-gray-500';
    }
    return variant === 'outline' ? 'text-blue-600' : 'text-white';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${getButtonStyle()} rounded-xl py-4 px-6 flex-row justify-center items-center`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563eb' : '#fff'} />
      ) : (
        <Text className={`${getTextStyle()} text-base font-semibold`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}