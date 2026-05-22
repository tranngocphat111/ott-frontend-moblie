require('react-native-url-polyfill/auto');

try {
  const livekitNative = require('@livekit/react-native');
  livekitNative?.registerGlobals?.();
} catch (error) {
  console.warn('LiveKit native globals are not available:', error);
}

require('expo-router/entry');
