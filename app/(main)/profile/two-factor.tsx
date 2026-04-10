import OtpInput from '@/components/auth/OtpInput';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useAuth } from '@/contexts/Authcontext';
import { useTwoFactor } from '@/hooks/profile/useTwoFactor';
import { useAccount } from '@/hooks/profile/useAccount';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'view' | 'enable' | 'disable';
type EnableStep = 'check-password' | 'set-password' | 'otp' | 'backup';
type DisableStep = 'password' | 'otp';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TwoFactorScreen() {
  const router = useRouter();
  const { status, isLoading, fetchStatus } = useTwoFactor();
  const [mode, setMode] = useState<Mode>('view');

  const handleComplete = async () => {
    await fetchStatus();
    setMode('view');
  };

  if (isLoading && !status) {
    return (
      <SafeAreaView className="flex-1 bg-brand-50 justify-center items-center">
        <ActivityIndicator size="large" color="#bc9166" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#694d31" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">Xác thực 2 bước</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Banner */}
      <View className={`px-6 py-5 items-center ${status?.enabled ? 'bg-brand-600' : 'bg-brand-500'}`}>
        <View className="w-14 h-14 rounded-2xl bg-white/20 justify-center items-center mb-3">
          <Feather name="shield" size={28} color="white" />
        </View>
        <Text className="text-white text-lg font-bold">Xác thực 2 bước</Text>
        <Text className="text-white/80 text-sm mt-1">
          {status?.enabled ? 'Tài khoản đang được bảo vệ' : 'Tăng cường bảo mật tài khoản'}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-8">
          {mode === 'view' && (
            <ViewStatus
              enabled={status?.enabled ?? false}
              onEnable={() => setMode('enable')}
              onDisable={() => setMode('disable')}
            />
          )}
          {mode === 'enable' && (
            <EnableFlow
              onCancel={() => setMode('view')}
              onComplete={handleComplete}
            />
          )}
          {mode === 'disable' && (
            <DisableFlow
              onCancel={() => setMode('view')}
              onComplete={handleComplete}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── ViewStatus ───────────────────────────────────────────────────────────────
function ViewStatus({
  enabled,
  onEnable,
  onDisable,
}: {
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <View>
      {/* Status card */}
      <View className={`rounded-2xl p-4 mb-4 border ${enabled ? 'bg-green-50 border-green-200' : 'bg-brand-50 border-brand-200'}`}>
        <View className="flex-row items-center">
          <View className={`w-11 h-11 rounded-full justify-center items-center ${enabled ? 'bg-green-100' : 'bg-brand-100'}`}>
            <Feather name="shield" size={22} color={enabled ? '#16a34a' : '#bc9166'} />
          </View>
          <View className="ml-3 flex-1">
            <Text className={`font-bold text-sm ${enabled ? 'text-green-800' : 'text-brand-800'}`}>
              {enabled ? 'Đang bật' : 'Đang tắt'}
            </Text>
            <Text className={`text-xs mt-0.5 ${enabled ? 'text-green-600' : 'text-brand-500'}`}>
              {enabled ? 'Tài khoản được bảo vệ bằng 2FA' : 'Tài khoản chưa được bảo vệ 2FA'}
            </Text>
          </View>
          {enabled && <Feather name="check-circle" size={20} color="#16a34a" />}
        </View>
      </View>

      {/* Info */}
      <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
        <View className="flex-row items-start">
          <Feather name="info" size={16} color="#3b82f6" />
          <View className="flex-1 ml-2">
            <Text className="text-blue-900 font-semibold text-sm mb-1">Xác thực 2 bước là gì?</Text>
            <Text className="text-blue-800 text-xs leading-5">
              Thêm một lớp bảo mật cho tài khoản. Khi bật, bạn sẽ cần nhập mã OTP mỗi khi đăng nhập.
            </Text>
          </View>
        </View>
      </View>

      {/* Benefits */}
      <View className="bg-white border border-brand-100 rounded-2xl p-4 mb-6">
        <Text className="text-sm font-semibold text-brand-900 mb-3">Lợi ích</Text>
        {[
          'Bảo vệ tài khoản khỏi truy cập trái phép',
          'Nhận thông báo khi có đăng nhập lạ',
          'Tăng cường bảo mật dữ liệu cá nhân',
        ].map((benefit, i) => (
          <View key={i} className="flex-row items-start mb-2">
            <Feather name="check-circle" size={14} color="#16a34a" />
            <Text className="text-brand-700 text-sm ml-2 flex-1">{benefit}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      {enabled ? (
        <TouchableOpacity
          onPress={onDisable}
          className="border border-red-200 bg-red-50 rounded-2xl py-4 items-center"
        >
          <Text className="text-red-600 font-semibold">Tắt xác thực 2 bước</Text>
        </TouchableOpacity>
      ) : (
        <PrimaryButton title="Bật xác thực 2 bước" onPress={onEnable} />
      )}
    </View>
  );
}

// ─── EnableFlow ───────────────────────────────────────────────────────────────
function EnableFlow({ onCancel, onComplete }: { onCancel: () => void; onComplete: () => void }) {
  const { user } = useAuth();
  const { requestEnableOtp, enable, isLoading, countdown } = useTwoFactor();
  const { setPassword: setPasswordApi, isLoading: isSettingPassword } = useAccount();

  const [step, setStep] = useState<EnableStep>('check-password');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState<{ password?: string; confirm?: string }>({});
  const [otp, setOtp] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    const init = async () => {
      if (!user?.hasPassword) {
        setStep('set-password');
        return;
      }
      try {
        await requestEnableOtp();
        setStep('otp');
      } catch (err: any) {
        const msg: string = err?.response?.data?.message || err?.message || '';
        if (msg.includes('already enabled') || msg.includes('đã được bật')) {
          onCancel();
        } else if (msg.includes('password required')) {
          setStep('set-password');
        } else {
          onCancel();
        }
      }
    };

    init();
  }, []);

  const handleSetPassword = async () => {
    setPwErrors({});
    if (newPassword.length < 8) {
      setPwErrors({ password: 'Mật khẩu phải có ít nhất 8 ký tự' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwErrors({ confirm: 'Mật khẩu không khớp' });
      return;
    }
    try {
      await setPasswordApi({ password: newPassword, confirmPassword });
      setTimeout(async () => {
        try {
          await requestEnableOtp();
          setStep('otp');
        } catch {
          // ignore
        }
      }, 800);
    } catch {
      // error handled in hook
    }
  };

  const handleEnable = async () => {
    if (otp.length !== 6) return;
    try {
      const result = await enable({ otp });
      if (result?.backupCodes) {
        setBackupCodes(result.backupCodes);
        setStep('backup');
      }
    } catch {
      setOtp('');
    }
  };

  // check-password: loading spinner
  if (step === 'check-password') {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator size="large" color="#bc9166" />
      </View>
    );
  }

  // set-password
  if (step === 'set-password') {
    const busy = isLoading || isSettingPassword;
    return (
      <View className="bg-white rounded-2xl border border-brand-100 p-5">
        <View className="flex-row items-start bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5">
          <Feather name="alert-circle" size={16} color="#d97706" />
          <View className="flex-1 ml-2">
            <Text className="text-yellow-800 font-semibold text-sm">Yêu cầu tạo mật khẩu</Text>
            <Text className="text-yellow-700 text-xs mt-1">
              Bạn đăng nhập bằng Google và chưa có mật khẩu. Vui lòng tạo mật khẩu để bật xác thực 2 bước.
            </Text>
          </View>
        </View>

        <TextInputField
          label="Mật khẩu mới"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Tối thiểu 8 ký tự"
          error={pwErrors.password}
          icon="lock"
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInputField
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Nhập lại mật khẩu"
          error={pwErrors.confirm}
          icon="lock"
          secureTextEntry
          autoCapitalize="none"
        />

        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 py-3 rounded-2xl border border-brand-200 items-center"
          >
            <Text className="text-brand-700 font-semibold">Hủy</Text>
          </TouchableOpacity>
          <PrimaryButton
            title={busy ? 'Đang xử lý...' : 'Tiếp tục'}
            onPress={handleSetPassword}
            loading={busy}
            disabled={busy || !newPassword || !confirmPassword}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  }

  // otp
  if (step === 'otp') {
    return (
      <View className="bg-white rounded-2xl border border-brand-100 p-5">
        <Text className="text-sm text-brand-600 text-center mb-4">
          Mã OTP đã được gửi đến email{user?.email ? ` ${user.email}` : ' của bạn'}
        </Text>

        <OtpInput
          value={otp}
          onChangeText={setOtp}
          countdown={countdown}
          onResend={async () => { await requestEnableOtp(); setOtp(''); }}
        />

        <View className="flex-row gap-3 mt-4">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 py-3 rounded-2xl border border-brand-200 items-center"
          >
            <Text className="text-brand-700 font-semibold">Quay lại</Text>
          </TouchableOpacity>
          <PrimaryButton
            title={isLoading ? 'Đang xác thực...' : 'Xác nhận'}
            onPress={handleEnable}
            loading={isLoading}
            disabled={isLoading || otp.length !== 6}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  }

  // backup codes
  if (step === 'backup') {
    return (
      <View className="bg-white rounded-2xl border border-brand-100 p-5">
        <View className="flex-row items-start bg-green-50 border border-green-200 rounded-xl p-3 mb-5">
          <Feather name="check-circle" size={16} color="#16a34a" />
          <View className="flex-1 ml-2">
            <Text className="text-green-800 font-semibold text-sm">Xác thực 2 bước đã được bật!</Text>
            <Text className="text-green-700 text-xs mt-1">
              Hãy lưu các mã dự phòng bên dưới. Bạn sẽ cần chúng nếu không thể truy cập email.
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-bold text-brand-800">
            Mã dự phòng ({backupCodes.length} mã)
          </Text>
          <TouchableOpacity
            onPress={() => {
              // expo-clipboard hoặc @react-native-clipboard/clipboard
              Alert.alert('Đã sao chép', 'Các mã dự phòng đã được sao chép');
            }}
            className="flex-row items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-lg"
          >
            <Feather name="copy" size={12} color="#694d31" />
            <Text className="text-xs font-semibold text-brand-700 ml-1">Sao chép</Text>
          </TouchableOpacity>
        </View>

        {/* Grid 2 cột */}
        <View className="bg-brand-50 border border-brand-100 rounded-xl p-3 mb-4">
          <View className="flex-row flex-wrap">
            {backupCodes.map((code, i) => (
              <View key={i} style={{ width: '50%', padding: 4 }}>
                <View className="bg-white border border-brand-100 rounded-lg py-2 items-center">
                  <Text className="font-mono text-sm font-bold text-brand-800">{code}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="flex-row items-start bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5">
          <Feather name="alert-circle" size={14} color="#d97706" />
          <Text className="text-yellow-700 text-xs ml-2 flex-1">
            Mỗi mã chỉ dùng một lần. Lưu ở nơi an toàn để dùng khi không thể truy cập email.
          </Text>
        </View>

        <PrimaryButton title="Hoàn tất" onPress={onComplete} />
      </View>
    );
  }

  return null;
}

// ─── DisableFlow ──────────────────────────────────────────────────────────────
function DisableFlow({ onCancel, onComplete }: { onCancel: () => void; onComplete: () => void }) {
  const { user } = useAuth();
  const { requestDisableOtp, disable, isLoading, countdown } = useTwoFactor();

  const [step, setStep] = useState<DisableStep>('password');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequestDisable = async () => {
    if (!password) return;
    try {
      await requestDisableOtp(password);
      setStep('otp');
    } catch {
      // error handled in hook
    }
  };

  const handleDisable = async () => {
    if (otp.length !== 6) return;
    try {
      await disable({ password, otp });
      setTimeout(onComplete, 800);
    } catch {
      setOtp('');
    }
  };

  // password step
  if (step === 'password') {
    return (
      <View className="bg-white rounded-2xl border border-brand-100 p-5">
        <View className="flex-row items-start bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
          <Feather name="alert-circle" size={16} color="#dc2626" />
          <View className="flex-1 ml-2">
            <Text className="text-red-800 font-semibold text-sm">Cảnh báo bảo mật</Text>
            <Text className="text-red-700 text-xs mt-1">
              Tắt xác thực 2 bước sẽ làm giảm mức độ bảo mật tài khoản của bạn.
            </Text>
          </View>
        </View>

        <TextInputField
          label="Nhập mật khẩu để xác nhận"
          value={password}
          onChangeText={setPassword}
          placeholder="Nhập mật khẩu của bạn"
          icon="lock"
          secureTextEntry
          autoCapitalize="none"
        />

        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 py-3 rounded-2xl border border-brand-200 items-center"
          >
            <Text className="text-brand-700 font-semibold">Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRequestDisable}
            disabled={isLoading || !password}
            className={`flex-1 py-3 rounded-2xl items-center ${isLoading || !password ? 'bg-red-200' : 'bg-red-500'}`}
          >
            <Text className="text-white font-semibold">
              {isLoading ? 'Đang xử lý...' : 'Tiếp tục'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // otp step
  return (
    <View className="bg-white rounded-2xl border border-brand-100 p-5">
      <Text className="text-sm text-brand-600 text-center mb-4">
        Mã OTP đã được gửi đến email{user?.email ? ` ${user.email}` : ' của bạn'}
      </Text>

      <OtpInput
        value={otp}
        onChangeText={setOtp}
        countdown={countdown}
        onResend={async () => { await requestDisableOtp(password); setOtp(''); }}
      />

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity
          onPress={() => setStep('password')}
          className="flex-1 py-3 rounded-2xl border border-brand-200 items-center"
        >
          <Text className="text-brand-700 font-semibold">Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDisable}
          disabled={isLoading || otp.length !== 6}
          className={`flex-1 py-3 rounded-2xl items-center ${isLoading || otp.length !== 6 ? 'bg-red-200' : 'bg-red-500'}`}
        >
          <Text className="text-white font-semibold">
            {isLoading ? 'Đang tắt...' : 'Tắt xác thực 2 bước'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}