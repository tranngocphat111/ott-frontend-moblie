import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { AuthProvider } from '@/contexts/Authcontext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ThemeProvider } from '@/contexts/Themecontext';
import { ToastProvider } from '@/contexts/ToastContext';
import { THEME_COLORS } from '@/constants/theme';
import LoadingScreen from '@/components/common/LoadingScreen';

WebBrowser.maybeCompleteAuthSession();

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

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(THEME_COLORS.surface.DEFAULT);
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
