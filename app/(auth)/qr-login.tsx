// app/(auth)/qr-login.tsx
import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useQrGenerate } from '@/hooks/auth/useQrGenerate';

export default function QrLoginScreen() {
  const router = useRouter();
  const { qrCode, status, isLoading, error, countdown, generateQr, refreshQr } = useQrGenerate();

  useEffect(() => {
    // Generate QR code when screen loads
    generateQr();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return '#3b82f6';
      case 'scanned': return '#f59e0b';
      case 'confirmed': return '#22c55e';
      case 'expired': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Chờ quét mã';
      case 'scanned': return 'Đã quét - Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'expired': return 'Mã QR đã hết hạn';
      case 'cancelled': return 'Đã hủy';
      default: return 'Chờ quét mã';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return 'loader';
      case 'scanned': return 'smartphone';
      case 'confirmed': return 'check-circle';
      case 'expired': return 'x-circle';
      case 'cancelled': return 'x-circle';
      default: return 'loader';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <TouchableOpacity
        onPress={() => router.back()}
        className="px-6 pt-4"
      >
        <Feather name="arrow-left" size={28} color="#374151" />
      </TouchableOpacity>

      <View className="flex-1 justify-center items-center px-6">
        {isLoading && !qrCode ? (
          <>
            <ActivityIndicator size="large" color="#0084ff" />
            <Text className="text-gray-600 mt-4">Đang tạo mã QR...</Text>
          </>
        ) : error ? (
          <>
            <Feather name="alert-circle" size={64} color="#ef4444" />
            <Text className="text-xl font-bold text-gray-900 mt-6 mb-2 text-center">
              Lỗi
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
              {error}
            </Text>
            <TouchableOpacity
              onPress={refreshQr}
              className="bg-blue-600 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-semibold">Thử lại</Text>
            </TouchableOpacity>
          </>
        ) : qrCode ? (
          <>
            {/* Title */}
            <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Đăng nhập bằng QR
            </Text>
            <Text className="text-base text-gray-600 mb-8 text-center">
              Sử dụng ứng dụng mobile để quét mã
            </Text>

            {/* QR Code Container */}
            <View className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200 mb-6">
              {status === 'expired' || status === 'cancelled' ? (
                <View className="w-64 h-64 justify-center items-center">
                  <Feather name="x-circle" size={80} color="#ef4444" />
                  <Text className="text-gray-600 mt-4 font-medium">
                    {status === 'expired' ? 'Mã đã hết hạn' : 'Đã hủy'}
                  </Text>
                </View>
              ) : (
                <QRCode
                  value={qrCode.qrData}
                  size={256}
                  backgroundColor="white"
                  color="black"
                />
              )}
            </View>

            {/* Status */}
            <View className="flex-row items-center mb-4">
              <View 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: getStatusColor() }}
              />
              <Text className="text-base font-medium" style={{ color: getStatusColor() }}>
                {getStatusText()}
              </Text>
            </View>

            {/* Countdown */}
            {status === 'pending' || status === 'scanned' ? (
              <Text className="text-sm text-gray-500 mb-6">
                Mã hết hạn sau {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </Text>
            ) : null}

            {/* Instructions */}
            <View className="bg-blue-50 rounded-2xl p-6 w-full max-w-md mb-6">
              <Text className="text-blue-900 font-semibold mb-3">
                Hướng dẫn:
              </Text>
              <View className="space-y-2">
                <View className="flex-row items-start">
                  <Text className="text-blue-800 mr-2">1.</Text>
                  <Text className="flex-1 text-blue-800">
                    Mở ứng dụng ZaloChat trên điện thoại
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Text className="text-blue-800 mr-2">2.</Text>
                  <Text className="flex-1 text-blue-800">
                    Nhấn vào "Quét mã QR" tại màn hình đăng nhập
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Text className="text-blue-800 mr-2">3.</Text>
                  <Text className="flex-1 text-blue-800">
                    Quét mã QR này để đăng nhập
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            {(status === 'expired' || status === 'cancelled') && (
              <TouchableOpacity
                onPress={refreshQr}
                className="bg-blue-600 rounded-xl py-4 px-8"
              >
                <View className="flex-row items-center">
                  <Feather name="refresh-cw" size={20} color="#fff" />
                  <Text className="text-white font-semibold ml-2">
                    Tạo mã mới
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </View>

      {/* Footer */}
      <View className="px-6 pb-6">
        <View className="flex-row justify-center items-center">
          <Text className="text-gray-600 text-sm">
            Chưa có ứng dụng?{' '}
          </Text>
          <TouchableOpacity>
            <Text className="text-blue-600 text-sm font-semibold">
              Tải về ngay
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}