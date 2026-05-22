import { Stack } from 'expo-router';
import { THEME_COLORS } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: THEME_COLORS.surface.DEFAULT },
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="login" />
      <Stack.Screen name="demo-users" />
    </Stack>
  );
}
