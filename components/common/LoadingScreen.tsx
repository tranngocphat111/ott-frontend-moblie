import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/constants/theme';

interface Props {
  message?: string;
}

const riffLogo = require('../../assets/logo_tach_nen.png');

const LoadingScreen: React.FC<Props> = ({ message = 'Đang tải Riff...' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.35)).current;
  const dot2 = useRef(new Animated.Value(0.35)).current;
  const dot3 = useRef(new Animated.Value(0.35)).current;
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.35,
            duration: 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 160);
    animateDot(dot3, 320);
  }, [dot1, dot2, dot3, fadeAnim, logoScale, progressAnim, ringAnim]);

  const ringRotate = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressScale = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 1],
  });

  return (
    <LinearGradient
      colors={['#f7f3f0', '#efe7e0', '#fdfaf7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topBand} />
      <View style={styles.bottomBand} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          },
        ]}
      >
        <View style={styles.logoStage}>
          <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: ringRotate }] }]}>
            <View style={styles.ringAccent} />
          </Animated.View>
          <Animated.View style={[styles.logoCard, { transform: [{ scale: logoScale }] }]}>
            {logoBroken ? (
              <Text style={styles.logoFallback}>R</Text>
            ) : (
              <Image
                source={riffLogo}
                style={styles.logo}
                resizeMode="contain"
                onError={() => setLogoBroken(true)}
              />
            )}
          </Animated.View>
        </View>

        <Text style={styles.brand}>Riff</Text>
        <View style={styles.messageRow}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.dots}>
            {[dot1, dot2, dot3].map((dot, index) => (
              <Animated.View key={index} style={[styles.dot, { opacity: dot }]} />
            ))}
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { transform: [{ scaleX: progressScale }] }]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topBand: {
    position: 'absolute',
    top: -52,
    right: -42,
    width: 230,
    height: 150,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(139,102,66,0.12)',
    backgroundColor: 'rgba(255,255,255,0.36)',
    transform: [{ rotate: '13deg' }],
  },
  bottomBand: {
    position: 'absolute',
    bottom: -60,
    left: -54,
    width: 260,
    height: 150,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(139,102,66,0.1)',
    backgroundColor: 'rgba(208,169,126,0.18)',
    transform: [{ rotate: '-10deg' }],
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  logoStage: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  rotatingRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: 'rgba(139,102,66,0.18)',
  },
  ringAccent: {
    position: 'absolute',
    top: -2,
    left: 49,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[600],
  },
  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  logoFallback: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary[600],
  },
  logo: {
    width: 68,
    height: 68,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary[900],
    marginBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[700],
  },
  dots: {
    marginLeft: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[600],
  },
  progressTrack: {
    marginTop: 20,
    width: 148,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(139,102,66,0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary[600],
  },
});

export default LoadingScreen;
