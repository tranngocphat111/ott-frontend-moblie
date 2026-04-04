// components/auth/OtpInput.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
    // Auto focus when component mounts
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
          <Text className="text-sm font-medium text-blue-600">
            {countdown > 0 ? `Gửi lại (${countdown}s)` : 'Gửi lại'}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        className={`flex-row items-center border rounded-xl px-4 py-3 ${
          error ? 'border-red-500' : 'border-gray-300'
        } bg-white`}
      >
        <Feather name="shield" size={20} color={error ? '#ef4444' : '#6b7280'} />
        <TextInput
          ref={inputRef}
          className="flex-1 ml-3 text-base text-gray-900 tracking-widest"
          placeholder="000000"
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor="#9ca3af"
        />
        {value.length === 6 && (
          <Feather name="check-circle" size={20} color="#22c55e" />
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-2">
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text className="text-red-500 text-xs ml-1">{error}</Text>
        </View>
      )}

      <Text className="text-xs text-gray-500 mt-2">
        Mã OTP đã được gửi đến eamil của bạn. Vui lòng kiểm tra tin nhắn.
      </Text>
    </View>
  );
}