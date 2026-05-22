import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      <Text className="text-sm font-medium text-brand-700 mb-2">
        Email <Text className="text-red-500">*</Text>
      </Text>

      <View
        className={`flex-row items-center border rounded-2xl px-4 py-0 ${
          error ? 'border-red-500 bg-red-50/50' : 'border-brand-200 bg-surface-raised'
        } ${!editable ? 'bg-brand-100' : ''}`}
        style={{ minHeight: 56 }}
      >
        <Feather name="mail" size={20} color={error ? '#dc2626' : '#8b6642'} />

        <TextInput
          className="flex-1 ml-3 text-base text-brand-900"
          style={{
            minHeight: 24,
            paddingVertical: 0,
            fontSize: 15,
            lineHeight: 21,
            color: '#231a10',
            ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
          }}
          placeholder="example@gmail.com"
          value={value}
          onChangeText={onChangeText}
          keyboardType="email-address"
          inputMode="email"
          autoComplete="email"
          textContentType="emailAddress"
          importantForAutofill="yes"
          returnKeyType="next"
          underlineColorAndroid="transparent"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          editable={editable}
          placeholderTextColor="#bc9166"
        />

        {value && editable && onClear && (
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
