// components/auth/TextInputField.tsx
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

interface TextInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  icon?: string;
  required?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  maxLength?: number;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  inputMode?: TextInputProps['inputMode'];
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
  autoComplete,
  textContentType,
  returnKeyType,
  inputMode,
}: TextInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputHeight = multiline ? Math.max(numberOfLines * 22, 72) : 24;

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-sm font-medium text-brand-700 mb-2">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center border rounded-2xl px-4 ${
          multiline ? 'items-start py-3.5' : 'py-0'
        } ${error ? 'border-red-400 bg-red-50/50' : 'border-brand-200 bg-surface-raised'} ${
          !editable ? 'bg-brand-100' : ''
        }`}
        style={{ minHeight: multiline ? undefined : 56 }}
      >
        {icon && (
          <Feather
            name={icon as any}
            size={18}
            color={error ? '#dc2626' : '#8b6642'}
            style={{ marginTop: multiline ? 2 : 0 }}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#bc9166"
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          inputMode={inputMode}
          importantForAutofill="yes"
          underlineColorAndroid="transparent"
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`flex-1 text-sm text-brand-900 ${icon ? 'ml-3' : ''}`}
          style={{
            minHeight: inputHeight,
            paddingVertical: 0,
            fontSize: 14,
            lineHeight: 20,
            color: '#231a10',
            ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
          }}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color="#8b6642"
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-1.5 ml-1">
          <Feather name="alert-circle" size={13} color="#dc2626" />
          <Text className="text-red-600 text-xs ml-1">{error}</Text>
        </View>
      )}
    </View>
  );
}
