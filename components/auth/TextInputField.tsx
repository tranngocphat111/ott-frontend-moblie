// components/auth/TextInputField.tsx
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TextInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  icon?: string;
  required?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  maxLength?: number;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
}

export default function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  required = false,
  secureTextEntry = false,
  keyboardType = 'default',
  maxLength,
  editable = true,
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
}: TextInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="mb-4">
      {/* Label — ẩn nếu label rỗng (dùng trong bio field của edit.tsx) */}
      {label ? (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}{required && <Text className="text-red-500"> *</Text>}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center border rounded-xl px-4 ${
          multiline ? 'items-start py-3' : 'py-3'
        } ${error ? 'border-red-400' : 'border-gray-300'} ${
          !editable ? 'bg-gray-50' : 'bg-white'
        }`}
      >
        {icon && (
          <Feather
            name={icon as any}
            size={18}
            color={error ? '#ef4444' : '#9ca3af'}
            style={{ marginTop: multiline ? 2 : 0 }}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`flex-1 text-sm text-gray-900 ${icon ? 'ml-3' : ''}`}
          style={{ minHeight: multiline ? 72 : undefined }}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-1.5 ml-1">
          <Feather name="alert-circle" size={13} color="#ef4444" />
          <Text className="text-red-500 text-xs ml-1">{error}</Text>
        </View>
      )}
    </View>
  );
}