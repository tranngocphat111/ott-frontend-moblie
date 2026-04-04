// components/auth/EmailInput.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface EmailInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  editable?: boolean;
  onClear?: () => void;
}

export default function EmailInput({
  value,
  onChangeText,
  error,
  editable = true,
  onClear,
}: EmailInputProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-2">
        Email <Text className="text-red-500">*</Text>
      </Text>

      <View
        className={`flex-row items-center border rounded-xl px-4 py-3 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${!editable ? 'bg-gray-100' : 'bg-white'}`}
      >
        <Feather
          name="mail"
          size={20}
          color={error ? '#ef4444' : '#6b7280'}
        />

        <TextInput
          className="flex-1 ml-3 text-base text-gray-900"
          placeholder="example@gmail.com"
          value={value}
          onChangeText={onChangeText}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={100}
          editable={editable}
          placeholderTextColor="#9ca3af"
        />

        {value && editable && onClear && (
          <TouchableOpacity onPress={onClear} className="p-1">
            <Feather name="x-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-2">
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text className="text-red-500 text-xs ml-1">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}