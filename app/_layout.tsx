
import React, { useEffect } from 'react';

import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// NativeWind CSS
import '@/global.css';

// Providers
import { AuthProvider, useAuth } from '@/context/Authcontext';
import { ThemeProvider } from '@/context/Themecontext';

WebBrowser.maybeCompleteAuthSession();

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Debug logs
  useEffect(() => {
    console.log('🔍 Auth state:', { isAuthenticated, isLoading, segments });
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    if (isLoading) {
      console.log('⏳ Still loading...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    console.log('📍 Current segment:', segments[0]);
    console.log('🔐 In auth group:', inAuthGroup);
    console.log('🏠 In main group:', inMainGroup);

    if (!isAuthenticated && inMainGroup) {
      console.log('➡️ Redirecting to auth (not authenticated)');
      router.replace('/(auth)/landing');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('➡️ Redirecting to main (authenticated)');
      router.replace('/(main)/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    if (!isLoading) {
      console.log('✅ Loading complete, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

// Error Boundary Component
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
    console.error('❌ Error caught by boundary:', error, errorInfo);
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
  useEffect(() => {
    console.log('🚀 Root Layout mounted');
    SystemUI.setBackgroundColorAsync('#ffffff');
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}