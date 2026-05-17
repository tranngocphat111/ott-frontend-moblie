import React from 'react';
import { Stack } from 'expo-router';
import { NotificationsContent } from '@/components/notifications/NotificationsContent';

export default function NotificationsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Thông báo', headerBackTitle: 'Trở lại', headerShown: true }} />
      <NotificationsContent includeTopInset={false} />
    </>
  );
}
