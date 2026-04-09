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
      <Text className="text-sm font-medium text-brand-700 mb-2">
        Số điện thoại <Text className="text-red-500">*</Text>
      </Text>

      <View
        className={`flex-row items-center border rounded-2xl px-4 py-3.5 ${
          error ? 'border-red-500 bg-red-50/50' : 'border-brand-200 bg-surface-raised'
        } ${!editable ? 'bg-brand-100' : ''}`}
      >
        <Feather name="phone" size={20} color={error ? '#dc2626' : '#8b6642'} />

        <TextInput
          className="flex-1 ml-3 text-base text-brand-900"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={editable}
          placeholderTextColor="#bc9166"
        />

        {value.length > 0 && editable && onClear && (
          <TouchableOpacity onPress={onClear} className="p-1">
            <Feather name="x-circle" size={20} color="#bc9166" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-2">
          <Feather name="alert-circle" size={14} color="#dc2626" />
          <Text className="text-red-600 text-xs ml-1">{error}</Text>
        </View>
      )}
    </View>
  );
}
