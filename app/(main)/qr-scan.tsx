// app/(main)/qr-scan.tsx
import { useQrLogin } from '@/hooks/auth/useQrLogin';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QrScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { scanQr, confirmQr, isLoading } = useQrLogin();

  // ✅ useRef block ngay lập tức, không chờ re-render như useState
  const isProcessing = useRef(false);
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);

    const result = await scanQr(data);

    if (result?.qrId) {
      showConfirmDialog(result.qrId);
    } else {
      isProcessing.current = false;
      setScanned(false);
    }
  };

  const showConfirmDialog = (qrId: string) => {
    Alert.alert(
      'Xác nhận đăng nhập',
      'Bạn có muốn đăng nhập trên thiết bị này không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: async () => {
            await confirmQr(qrId, false);
            isProcessing.current = false;
            setScanned(false);
          },
        },
        {
          text: 'Đồng ý',
          onPress: async () => {
            const success = await confirmQr(qrId, true);
            if (success) {
              Alert.alert(
                'Thành công',
                'Đã xác nhận đăng nhập trên thiết bị khác',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } else {
              isProcessing.current = false;
              setScanned(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-brand-50">
        <StatusBar style="dark" />
        <TouchableOpacity onPress={() => router.back()} className="px-6 pt-4">
          <Feather name="arrow-left" size={28} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1 justify-center items-center px-6">
          <Feather name="camera-off" size={64} color="#9ca3af" />
          <Text className="text-xl font-bold text-brand-900 mt-6 mb-2 text-center">
            Cần quyền truy cập camera
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            Vui lòng cấp quyền truy cập camera để quét mã QR
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-brand-600 rounded-xl py-4 px-8"
          >
            <Text className="text-white font-semibold">Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar style="light" />

      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isProcessing.current ? undefined : handleBarCodeScanned}
      />

      {/* Back button */}
      <SafeAreaView
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="self-start m-4 bg-black/50 rounded-full p-2"
        >
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Khung quét */}
      <View
        style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' }}
        pointerEvents="none"
      >
        <View style={{ width: 240, height: 240, position: 'relative' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40,
            borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#fff', borderTopLeftRadius: 12 }} />
          <View style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40,
            borderTopWidth: 4, borderRightWidth: 4, borderColor: '#fff', borderTopRightRadius: 12 }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40,
            borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#fff', borderBottomLeftRadius: 12 }} />
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40,
            borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#fff', borderBottomRightRadius: 12 }} />
        </View>
      </View>

      {/* Bottom info */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none">
        <SafeAreaView>
          <View className="mx-6 mb-8 bg-black/70 rounded-2xl p-6 items-center">
            {scanned ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Feather name="maximize" size={40} color="#fff" />
            )}
            <Text className="text-white text-lg font-semibold mt-4 mb-1">
              {scanned ? 'Đang xử lý...' : 'Quét mã QR'}
            </Text>
            <Text className="text-white/70 text-sm text-center">
              {scanned
                ? 'Vui lòng chờ xác nhận'
                : 'Đưa mã QR trên web vào khung để đăng nhập'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}