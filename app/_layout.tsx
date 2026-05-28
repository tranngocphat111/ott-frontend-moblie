import Constants from 'expo-constants';
import { router, Stack, usePathname } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { AuthProvider } from '@/contexts/Authcontext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ThemeProvider } from '@/contexts/Themecontext';
import { ToastProvider } from '@/contexts/ToastContext';
import { THEME_COLORS } from '@/constants/theme';
import LoadingScreen from '@/components/common/LoadingScreen';
import { setSystemBackgroundAsync } from '@/utils/useSystemBackground';

WebBrowser.maybeCompleteAuthSession();

const isRunningInExpoGo = Constants.appOwnership === 'expo';

const hasStoredAuthSession = async () => {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync('accessToken'),
    SecureStore.getItemAsync('refreshToken'),
  ]);
  return Boolean(accessToken || refreshToken);
};

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME_COLORS.surface.DEFAULT },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="index" />
    </Stack>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error:', error, errorInfo);
    void SplashScreen.hideAsync().catch(() => undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: 'red', textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const [showBootOverlay, setShowBootOverlay] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    void setSystemBackgroundAsync(THEME_COLORS.surface.DEFAULT, 'dark');
    const hideSplash = () => {
      void SplashScreen.hideAsync().catch(() => undefined);
    };

    hideSplash();
    const fallbackTimer = setTimeout(hideSplash, 500);
    const bootTimer = setTimeout(() => setShowBootOverlay(false), 900);
    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(bootTimer);
    };
  }, []);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void Updates.checkForUpdateAsync()
        .then(async (update) => {
          if (cancelled || !update.isAvailable) return;
          await Updates.fetchUpdateAsync();
          if (!cancelled) {
            await Updates.reloadAsync();
          }
        })
        .catch((error) => {
          console.warn('Không thể kiểm tra bản cập nhật OTA:', error);
        });
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isRunningInExpoGo) return;

    let cancelled = false;
    let subscription: { remove: () => void } | undefined;

    const openNotificationTarget = async (response?: NotificationResponse | null) => {
      if (!(await hasStoredAuthSession())) return;

      const data = response?.notification.request.content.data || {};
      const type = String(data.type || '').toLowerCase();
      const referenceId = String(
        data.referenceId || data.reference_id || data.conversationId || '',
      ).trim();

      if ((type.includes('message') || type.includes('chat')) && referenceId) {
        router.push(`/(main)/chat/${referenceId}` as any);
        return;
      }

      router.push('/(main)/(tabs)/home' as any);
    };

    const setupNotificationNavigation = async () => {
      const Notifications = await import('expo-notifications').catch((error) => {
        console.warn('[Notifications] Listener unavailable:', error?.message || error);
        return null;
      });
      if (!Notifications || cancelled) return;

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        void openNotificationTarget(response);
      });

      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) void openNotificationTarget(response);
        })
        .catch(() => undefined);
    };

    void setupNotificationNavigation();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pathname.includes('contacts')) {
        void hasStoredAuthSession().then((hasSession) => {
          if (hasSession) {
            router.replace('/(main)/(tabs)/home' as any);
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [pathname]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView
        style={{ flex: 1 }}
        onLayout={() => {
          void SplashScreen.hideAsync().catch(() => undefined);
        }}
      >
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <PresenceProvider>
                <ToastProvider>
                  <RootLayoutNav />
                  <StatusBar style="auto" />
                  {showBootOverlay && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 999,
                        elevation: 999,
                      }}
                    >
                      <LoadingScreen message="Đang mở Riff" />
                    </View>
                  )}
                </ToastProvider>
              </PresenceProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
