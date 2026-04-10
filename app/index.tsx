import { useAuth } from '@/contexts/Authcontext';
import { THEME_COLORS } from '@/constants/theme';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: THEME_COLORS.surface.DEFAULT,
        }}
      >
        <ActivityIndicator size="large" color={THEME_COLORS.primary[600]} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/landing" />;
}
