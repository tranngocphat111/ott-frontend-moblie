import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

interface Props {
  message?: string;
}

const LoadingScreen: React.FC<Props> = ({ message = 'Đang tải...' }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Spin
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Dots stagger
    const animDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    animDot(dot1, 0);
    animDot(dot2, 200);
    animDot(dot3, 400);
  }, []);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Ambient blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Spinner + logo */}
      <View style={styles.spinnerWrap}>
        {/* Outer spinning ring */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}
        >
          <View style={styles.ringOuter} />
          <View style={styles.ringArc} />
        </Animated.View>

        {/* Inner pulse ring */}
        <Animated.View style={[styles.ringInner, { opacity: pulseAnim }]} />

        {/* Logo circle */}
        <View style={styles.logoBg}>
          <Image
            source={require('@/assets/images/logo_tach_nen.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Brand name */}
      <Text style={styles.brand}>Riff</Text>

      {/* Message + dots */}
      <View style={styles.msgRow}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

const SIZE = 88;
const LOGO_INSET = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    position: 'relative',
  },

  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: `${colors.primary[200]}30`,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${colors.primary[300]}25`,
  },

  spinnerWrap: {
    width: SIZE,
    height: SIZE,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // Track ring (nền xám nhạt)
  ringOuter: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary[100],
  },
  // Arc accent — dùng border với 3 cạnh trong suốt để tạo arc
  ringArc: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderTopColor: colors.primary[400],
    borderRightColor: colors.primary[300],
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  ringInner: {
    position: 'absolute',
    width: SIZE - 20,
    height: SIZE - 20,
    borderRadius: (SIZE - 20) / 2,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },

  logoBg: {
    width: SIZE - LOGO_INSET * 2,
    height: SIZE - LOGO_INSET * 2,
    borderRadius: (SIZE - LOGO_INSET * 2) / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 28,
    height: 28,
  },

  brand: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 8,
    letterSpacing: -0.3,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  message: {
    fontSize: 13,
    color: colors.primary[400],
    fontFamily: fonts.body,
    fontWeight: '500',
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[400],
  },
});

export default LoadingScreen;
