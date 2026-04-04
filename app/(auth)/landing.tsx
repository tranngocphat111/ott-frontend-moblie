// app/(auth)/landing.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();

  console.log('🎯 Landing screen rendered');

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#0084ff', '#00c6ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Logo & Branding */}
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <View style={{ 
              width: 80, 
              height: 80, 
              backgroundColor: 'rgba(255,255,255,0.3)', 
              borderRadius: 40, 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 50 }}>💬</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
              ZaloChat
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center' }}>
              Kết nối mọi người, mọi lúc, mọi nơi
            </Text>
          </View>

          {/* Illustration */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Text style={{ fontSize: 60 }}>✨</Text>
              <Text style={{ fontSize: 60 }}>📱</Text>
              <Text style={{ fontSize: 60 }}>💬</Text>
            </View>
          </View>

          {/* Features */}
          <View style={{ gap: 12, marginBottom: 32 }}>
            <FeatureItem icon="✨" text="Nhắn tin nhanh chóng" />
            <FeatureItem icon="📞" text="Gọi điện miễn phí" />
            <FeatureItem icon="🔒" text="Bảo mật tuyệt đối" />
          </View>

          {/* Actions */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: '#fff', 
                paddingVertical: 16, 
                borderRadius: 12, 
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5
              }}
              onPress={() => {
                console.log('Navigate to login');
                router.push('/(auth)/login');
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#0084ff', fontSize: 18, fontWeight: 'bold' }}>
                Đăng nhập
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ 
                backgroundColor: 'transparent', 
                paddingVertical: 16, 
                borderRadius: 12, 
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#fff'
              }}
              onPress={() => {
                console.log('Navigate to register');
                router.push('/(auth)/register');
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                Đăng ký tài khoản
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ paddingBottom: 20 }}>
            <Text style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: 12, 
              textAlign: 'center',
              lineHeight: 18
            }}>
              Bằng việc tiếp tục, bạn đồng ý với{'\n'}
              <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
                Điều khoản sử dụng
              </Text> và{' '}
              <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
                Chính sách bảo mật
              </Text>
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      padding: 12, 
      borderRadius: 12 
    }}>
      <Text style={{ fontSize: 24, marginRight: 12 }}>{icon}</Text>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}