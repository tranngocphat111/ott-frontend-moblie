import { Stack } from 'expo-router';
import { THEME_COLORS } from '@/constants/theme';
import { IncomingCallGate } from '@/components/call/IncomingCallGate';
import { MobileGroupCallOverlay } from '@/components/call/MobileGroupCallOverlay';
import { useEffect } from 'react';
import { warmUpAppPermissionsOnce } from '@/utils/appPermissions';

export default function MainLayout() {
  useEffect(() => {
    void warmUpAppPermissionsOnce();
  }, []);

  return (
    <>
      <IncomingCallGate />
      <MobileGroupCallOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: THEME_COLORS.surface.DEFAULT },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none', }} />
        <Stack.Screen name="call" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
