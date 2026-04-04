// components/auth/LoginOptionButton.tsx
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface LoginOptionButtonProps {
    icon?: string;
    label: string;
    onPress: () => void;
    iconColor?: string;
    customIcon?: React.ReactNode;
    disabled?: boolean;
}

export default function LoginOptionButton({
    icon,
    label,
    onPress,
    iconColor = '#374151',
    customIcon,
    disabled = false,
}: LoginOptionButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            className={`flex-row items-center justify-center border rounded-xl py-3.5 ${disabled ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-200 bg-gray-50'
                }`}
            activeOpacity={0.7}
        >
            <View className="w-5 h-5 justify-center items-center mr-2">
                {customIcon ?? <Feather name={icon as any} size={18} color={iconColor} />}
            </View>
            <Text className="text-gray-700 font-semibold text-sm">{label}</Text>
        </TouchableOpacity>
    );
}