import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';

import FeaturesSection from '@/components/(auth)/landing/FeaturesSection';
import HeroSection from '@/components/(auth)/landing/HeroSection';
import { RefreshControl } from 'react-native-gesture-handler';

export default function LandingScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1 bg-[#f7f3f0]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ae7f53"
            colors={['#ae7f53']}
          />
        }
      >
        <HeroSection />
        <FeaturesSection />
      </ScrollView>
    </>
  );
}