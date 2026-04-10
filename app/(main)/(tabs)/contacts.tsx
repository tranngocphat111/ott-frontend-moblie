import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactsScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-sunken" edges={['top']}>
      <View className="rounded-2xl bg-white px-6 py-5 shadow-sm">
        <Text className="text-center text-[20px] font-bold text-slate-900">Danh bạ</Text>
        <Text className="mt-2 text-center text-[14px] text-slate-500">
          Màn hình đang được hoàn thiện.
        </Text>
      </View>
    </SafeAreaView>
  );
}
