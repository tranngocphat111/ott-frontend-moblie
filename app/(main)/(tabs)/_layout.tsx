import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '@/constants/theme';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 14);
  const tabBarHeight = bottomInset + 68;
  const renderTabIcon = (name: TabIconName, focusedName: TabIconName) =>
    ({ focused }: { focused: boolean; color: string; size: number }) => (
      <View
        style={{
          width: focused ? 44 : 38,
          height: 32,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? '#f1e5da' : 'transparent',
        }}
      >
        <Ionicons
          name={focused ? focusedName : name}
          size={focused ? 22 : 21}
          color={focused ? THEME_COLORS.primary[700] : THEME_COLORS.primary[400]}
        />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME_COLORS.primary[700],
        tabBarInactiveTintColor: THEME_COLORS.primary[400],
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: THEME_COLORS.surface.raised,
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 9,
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 3,
        },
        tabBarItemStyle: {
          borderRadius: 22,
          marginHorizontal: 3,
          paddingTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: renderTabIcon('chatbubble-ellipses-outline', 'chatbubble-ellipses'),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Thông báo',
          tabBarIcon: renderTabIcon('notifications-outline', 'notifications'),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: renderTabIcon('compass-outline', 'compass'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: renderTabIcon('person-outline', 'person'),
        }}
      />
    </Tabs>
  );
}
