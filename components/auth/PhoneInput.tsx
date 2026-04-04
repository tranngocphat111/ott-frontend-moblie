// components/auth/PhoneInput.tsx
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  error?: string;
  editable?: boolean;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChangeText,
  onClear,
  error,
  editable = true,
  placeholder = 'Nhập số điện thoại',
}: PhoneInputProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-2">
        Số điện thoại <Text className="text-red-500">*</Text>
      </Text>

      <View
        className={`flex-row items-center border rounded-xl px-4 py-3 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${!editable ? 'bg-gray-100' : 'bg-white'}`}
      >
        <Feather
          name="phone"
          size={20}
          color={error ? '#ef4444' : '#6b7280'}
        />

        <TextInput
          className="flex-1 ml-3 text-base text-gray-900"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={editable}
          placeholderTextColor="#9ca3af"
        />

        {value.length > 0 && editable && onClear && (
          <TouchableOpacity onPress={onClear} className="p-1">
            <Feather name="x-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-2">
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text className="text-red-500 text-xs ml-1">{error}</Text>
        </View>
      )}
    </View>
  );
}