import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

const BOOTSTRAP_KEY = 'riff_app_permissions_bootstrap_v2';
const PROMPT_KEY_PREFIX = 'riff_permission_prompted_v2';

type PermissionLike = {
  granted?: boolean;
  status?: string;
  canAskAgain?: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

const isGranted = (permission?: PermissionLike | null) =>
  Boolean(
    permission?.granted ||
    permission?.status === 'granted' ||
    permission?.accessPrivileges === 'all' ||
    permission?.accessPrivileges === 'limited',
  );

const MEDIA_LIBRARY_GRANULAR_PERMISSIONS: MediaLibrary.GranularPermission[] = ['photo', 'video'];

const ensurePermissionOnce = async (
  key: string,
  getPermission: () => Promise<PermissionLike>,
  requestPermission: () => Promise<PermissionLike>,
) => {
  try {
    const current = await getPermission();
    if (isGranted(current)) return true;

    const promptedKey = `${PROMPT_KEY_PREFIX}:${key}`;
    const wasPrompted = await AsyncStorage.getItem(promptedKey);
    if (wasPrompted || current.canAskAgain === false) return false;

    await AsyncStorage.setItem(promptedKey, '1');
    const next = await requestPermission();
    return isGranted(next);
  } catch (error) {
    console.warn(`Không thể kiểm tra quyền ${key}:`, error);
    return false;
  }
};

export const ensureCameraPermission = () =>
  ensurePermissionOnce(
    'camera',
    ImagePicker.getCameraPermissionsAsync,
    ImagePicker.requestCameraPermissionsAsync,
  );

export const ensureImageLibraryPermission = () =>
  ensurePermissionOnce(
    'image-library',
    ImagePicker.getMediaLibraryPermissionsAsync,
    ImagePicker.requestMediaLibraryPermissionsAsync,
  );

export const ensureMediaLibraryPermission = () =>
  ensurePermissionOnce(
    'media-library',
    () => MediaLibrary.getPermissionsAsync(false, MEDIA_LIBRARY_GRANULAR_PERMISSIONS),
    () => MediaLibrary.requestPermissionsAsync(false, MEDIA_LIBRARY_GRANULAR_PERMISSIONS),
  );

export const ensureMicrophonePermission = () =>
  ensurePermissionOnce(
    'microphone',
    Audio.getPermissionsAsync,
    Audio.requestPermissionsAsync,
  );

export const warmUpAppPermissionsOnce = async () => {
  const didBootstrap = await AsyncStorage.getItem(BOOTSTRAP_KEY);
  if (didBootstrap) return;

  await ensureCameraPermission();
  await ensureMicrophonePermission();
  await ensureImageLibraryPermission();
  await ensureMediaLibraryPermission();
  await AsyncStorage.setItem(BOOTSTRAP_KEY, '1');
};
