// components/auth/OtpInput.tsx
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface OtpInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  countdown: number;
  onResend: () => void;
}

export default function OtpInput({
  value,
  onChangeText,
  error,
  countdown,
  onResend,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-gray-700">
          Mã OTP <Text className="text-red-500">*</Text>
        </Text>
        <TouchableOpacity
          onPress={onResend}
          disabled={countdown > 0}
          className={countdown > 0 ? 'opacity-50' : ''}
        >
          <Text className="text-sm font-medium text-brand-600">
            {countdown > 0 ? `Gửi lại (${countdown}s)` : 'Gửi lại'}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        className={`flex-row items-center border rounded-2xl px-4 py-3.5 ${
          error ? 'border-red-500 bg-red-50/50' : 'border-brand-200 bg-surface-raised'
        }`}
      >
        <Feather name="shield" size={20} color={error ? '#dc2626' : '#8b6642'} />
        <TextInput
          ref={inputRef}
          className="flex-1 ml-3 text-base text-brand-900 tracking-[5px]"
          placeholder="000000"
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor="#bc9166"
        />
        {value.length === 6 && <Feather name="check-circle" size={20} color="#16a34a" />}
      </View>

      {error && (
        <View className="flex-row items-center mt-2">
          <Feather name="alert-circle" size={14} color="#dc2626" />
          <Text className="text-red-600 text-xs ml-1">{error}</Text>
        </View>
      )}

      <Text className="text-xs text-brand-500 mt-2">
        Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra tin nhắn.
      </Text>
    </View>
  );
}