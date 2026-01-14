import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import '../global.css';

const API_BASE_URL = 'http://192.168.1.7:8080/riff/api/auth';

interface LoginForm {
  phone: string;
  password: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
}

interface ApiResponse<T> {
  result?: T;
  message?: string;
  code?: number;
}

interface AuthenticationResponse {
  token: string;
  refreshToken: string;
  authenticated: boolean;
}

interface QRStatusResponse {
  qrId: string;
  status: string;
  message?: string;
}

type TabType = 'login' | 'scanner' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loading, setLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const processingRef = useRef<boolean>(false);

  const [loginForm, setLoginForm] = useState<LoginForm>({
    phone: '',
    password: '',
    deviceId: 'mobile-' + Math.random().toString(36).substr(2, 9),
    deviceType: 'MOBILE',
    deviceName: 'Expo React Native',
  });

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (activeTab === 'scanner') {
      requestCameraPermission();
      // Reset scan state khi vào tab scanner
      setScanned(false);
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [activeTab]);

  const loadToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        setActiveTab('profile');
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleLogin = async () => {
    if (!loginForm.phone || !loginForm.password) {
      Alert.alert('Error', 'Please enter phone and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data: ApiResponse<AuthenticationResponse> = await response.json();

      if (response.ok && data.result) {
        await AsyncStorage.setItem('token', data.result.token);
        await AsyncStorage.setItem('refreshToken', data.result.refreshToken);
        setToken(data.result.token);
        Alert.alert('Success', data.message || 'Login successful!');
        setActiveTab('profile');
      } else {
        Alert.alert('Error', data.message || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: token,
          deviceId: loginForm.deviceId,
        }),
      });

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      setToken(null);
      Alert.alert('Success', 'Logged out successfully');
      setActiveTab('login');
    } catch (error) {
      Alert.alert('Error', 'Logout failed: ' + (error as Error).message);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans - kiểm tra cả state và ref
    if (scanned || isProcessing || processingRef.current) {
      console.log('Already processing, ignoring scan');
      return;
    }

    // Set tất cả flags để block scan tiếp theo
    setScanned(true);
    setIsProcessing(true);
    processingRef.current = true;

    console.log('QR Code scanned:', data);

    if (!token) {
      Alert.alert('Error', 'Please login first');
      resetScanState();
      return;
    }

    try {
      const scanResponse = await fetch(`${API_BASE_URL}/qr/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          qrData: data,
          deviceId: loginForm.deviceId,
          deviceType: 'MOBILE',
          deviceInfo: 'Expo React Native',
        }),
      });

      const scanData: ApiResponse<QRStatusResponse> = await scanResponse.json();

      if (scanResponse.ok && scanData.result) {
        // Hiển thị confirm dialog
        Alert.alert(
          'Confirm Login',
          'Do you want to login on this device?',
          [
            {
              text: 'Cancel',
              onPress: async () => {
                try {
                  await fetch(`${API_BASE_URL}/qr/confirm`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                      qrId: scanData.result?.qrId,
                      confirmed: false,
                    }),
                  });
                } catch (error) {
                  console.error('Cancel error:', error);
                }
                resetScanState();
              },
              style: 'cancel',
            },
            {
              text: 'Confirm',
              onPress: async () => {
                try {
                  const confirmResponse = await fetch(`${API_BASE_URL}/qr/confirm`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                      qrId: scanData.result?.qrId,
                      confirmed: true,
                    }),
                  });

                  const confirmData: ApiResponse<QRStatusResponse> =
                    await confirmResponse.json();

                  if (confirmResponse.ok) {
                    Alert.alert('Success', confirmData.result?.message || 'Login confirmed!');
                    // Chuyển sang tab profile và reset scan state
                    setActiveTab('profile');
                    resetScanState();
                  } else {
                    Alert.alert('Error', confirmData.message || 'Confirmation failed');
                    resetScanState();
                  }
                } catch (error) {
                  Alert.alert('Error', 'Confirmation failed: ' + (error as Error).message);
                  resetScanState();
                }
              },
            },
          ],
          {
            onDismiss: () => {
              // Reset nếu user dismiss alert bằng cách tap outside
              resetScanState();
            }
          }
        );
      } else {
        Alert.alert('Error', scanData.message || 'QR scan failed');
        resetScanState();
      }
    } catch (error) {
      Alert.alert('Error', 'QR scan failed: ' + (error as Error).message);
      resetScanState();
    }
  };

  // Hàm reset scan state
  const resetScanState = () => {
    setScanned(false);
    setIsProcessing(false);
    processingRef.current = false;
  };

  const introspectToken = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data: ApiResponse<{ valid: boolean }> = await response.json();

      if (data.result) {
        Alert.alert(
          'Token Status',
          `Token is ${data.result.valid ? 'VALID ✓' : 'INVALID ✗'}`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Introspect failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshTokenFunc = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          deviceId: loginForm.deviceId,
        }),
      });

      const data: ApiResponse<AuthenticationResponse> = await response.json();

      if (response.ok && data.result) {
        await AsyncStorage.setItem('token', data.result.token);
        await AsyncStorage.setItem('refreshToken', data.result.refreshToken);
        setToken(data.result.token);
        Alert.alert('Success', data.message || 'Token refreshed successfully');
      } else {
        Alert.alert('Error', data.message || 'Refresh failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Refresh failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderLoginTab = () => (
    <View className="p-5">
      <Text className="text-3xl font-bold text-gray-900 mb-5">
        Phone Login
      </Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </Text>
        <TextInput
          className="bg-white border border-gray-300 rounded-lg p-3 text-base"
          placeholder="0912345678"
          value={loginForm.phone}
          onChangeText={(text) => setLoginForm({ ...loginForm, phone: text })}
          keyboardType="phone-pad"
          editable={!loading}
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Password
        </Text>
        <TextInput
          className="bg-white border border-gray-300 rounded-lg p-3 text-base"
          placeholder="Enter password"
          value={loginForm.password}
          onChangeText={(text) => setLoginForm({ ...loginForm, password: text })}
          secureTextEntry
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        className={`bg-indigo-600 p-4 rounded-lg items-center mt-2 ${loading ? 'opacity-50' : ''}`}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-base font-semibold">
            Login
          </Text>
        )}
      </TouchableOpacity>

      <View className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Text className="text-sm font-semibold text-gray-600 mb-2">
          📝 Test Credentials:
        </Text>
        <Text className="text-sm text-gray-800 mt-1">
          Phone: 0912345678
        </Text>
        <Text className="text-sm text-gray-800 mt-1">
          Password: password123
        </Text>
      </View>
    </View>
  );

  const renderScannerTab = () => {
    if (!token) {
      return (
        <View className="p-5">
          <Text className="text-base text-red-500 text-center font-semibold">
            Please login first to scan QR codes
          </Text>
        </View>
      );
    }

    if (hasPermission === null) {
      return (
        <View className="p-5 items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-sm text-gray-600 text-center mt-2">
            Requesting camera permission...
          </Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View className="p-5">
          <Text className="text-base text-red-500 text-center font-semibold mb-4">
            No access to camera
          </Text>
          <TouchableOpacity
            className="bg-indigo-600 p-4 rounded-lg items-center"
            onPress={requestCameraPermission}
          >
            <Text className="text-white text-base font-semibold">
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="p-5">
        <Text className="text-3xl font-bold text-gray-900 mb-5">
          Scan QR Code
        </Text>
        <Text className="text-sm text-gray-600 text-center mb-5">
          Point camera at QR code on web app
        </Text>

        <View className="h-96 rounded-xl overflow-hidden bg-black">
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />

          {/* Overlay hiển thị trạng thái */}
          {isProcessing && (
            <View className="absolute inset-0 bg-black bg-opacity-50 items-center justify-center">
              <ActivityIndicator size="large" color="#fff" />
              <Text className="text-white mt-2">Processing...</Text>
            </View>
          )}
        </View>

        {scanned && !isProcessing && (
          <TouchableOpacity
            className="bg-indigo-500 p-4 rounded-lg items-center mt-4"
            onPress={resetScanState}
          >
            <Text className="text-white text-base font-semibold">
              Tap to Scan Again
            </Text>
          </TouchableOpacity>
        )}

        <View className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Text className="text-xs text-blue-800 text-center">
            💡 Tip: Hold phone steady over QR code. Scan will happen automatically.
          </Text>
        </View>
      </View>
    );
  };

  const renderProfileTab = () => {
    if (!token) {
      return (
        <View className="p-5">
          <Text className="text-base text-red-500 text-center font-semibold">
            Not authenticated
          </Text>
          <Text className="text-sm text-gray-600 text-center mt-2">
            Please login first
          </Text>
        </View>
      );
    }

    return (
      <View className="p-5">
        <Text className="text-3xl font-bold text-gray-900 mb-5">
          Profile
        </Text>

        <View className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5">
          <Text className="text-xl font-bold text-green-900 mb-1">
            ✓ Authenticated
          </Text>
          <Text className="text-sm text-green-700 mb-4">
            Session is active
          </Text>

          <View className="bg-white rounded-lg p-3 border border-green-100">
            <Text className="text-xs text-gray-600 mb-1">
              Access Token:
            </Text>
            <Text className="text-xs text-gray-800" numberOfLines={2}>
              {token.substring(0, 100)}...
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            className="flex-1 bg-indigo-600 p-4 rounded-lg items-center"
            onPress={introspectToken}
            disabled={loading}
          >
            <Text className="text-white text-base font-semibold">
              🛡️ Verify
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-indigo-600 p-4 rounded-lg items-center"
            onPress={refreshTokenFunc}
            disabled={loading}
          >
            <Text className="text-white text-base font-semibold">
              🔄 Refresh
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-red-500 p-4 rounded-lg items-center"
          onPress={handleLogout}
        >
          <Text className="text-white text-base font-semibold">
            🚪 Logout
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="light-content" />

      <View className="bg-indigo-600 p-5 pt-2">
        <Text className="text-2xl font-bold text-white">
          OTT Auth - Mobile
        </Text>
        <Text className="text-sm text-indigo-200 mt-1">
          React Native Expo + NativeWind
        </Text>
      </View>

      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-4 items-center ${activeTab === 'login' ? 'border-b-2 border-indigo-600 bg-indigo-50' : ''
            }`}
          onPress={() => setActiveTab('login')}
        >
          <Text
            className={`text-sm font-medium ${activeTab === 'login' ? 'text-indigo-600 font-semibold' : 'text-gray-600'
              }`}
          >
            🔐 Login
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-4 items-center ${activeTab === 'scanner' ? 'border-b-2 border-indigo-600 bg-indigo-50' : ''
            }`}
          onPress={() => setActiveTab('scanner')}
        >
          <Text
            className={`text-sm font-medium ${activeTab === 'scanner' ? 'text-indigo-600 font-semibold' : 'text-gray-600'
              }`}
          >
            📷 Scan QR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-4 items-center ${activeTab === 'profile' ? 'border-b-2 border-indigo-600 bg-indigo-50' : ''
            }`}
          onPress={() => setActiveTab('profile')}
        >
          <Text
            className={`text-sm font-medium ${activeTab === 'profile' ? 'text-indigo-600 font-semibold' : 'text-gray-600'
              }`}
          >
            👤 Profile
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {activeTab === 'login' && renderLoginTab()}
        {activeTab === 'scanner' && renderScannerTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </ScrollView>

      <View className="bg-white p-3 border-t border-gray-200">
        <Text className="text-xs text-gray-600 text-center">
          Device ID: {loginForm.deviceId}
        </Text>
      </View>
    </SafeAreaView>
  );
}