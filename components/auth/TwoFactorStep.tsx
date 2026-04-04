// components/auth/TwoFactorStep.tsx
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface TwoFactorStepProps {
    otp: string;
    onChangeOtp: (value: string) => void;
    onVerify: () => void;
    onResend: () => void;
    onBack: () => void;
    countdown: number;
    isLoading: boolean;
    error?: string;
}

export default function TwoFactorStep({
    otp,
    onChangeOtp,
    onVerify,
    onResend,
    onBack,
    countdown,
    isLoading,
    error,
}: TwoFactorStepProps) {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-6 pt-4 pb-2">
                <TouchableOpacity onPress={onBack} className="mr-3">
                    <Feather name="arrow-left" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900">Xác thực 2 bước</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                    <View className="px-6 pt-6 pb-6">
                        {/* Icon */}
                        <View className="items-center mb-8">
                            <View className="w-20 h-20 bg-blue-100 rounded-full justify-center items-center">
                                <Feather name="shield" size={40} color="#3b82f6" />
                            </View>
                            <Text className="text-base font-semibold text-gray-900 mt-4">
                                Nhập mã xác thực
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1 text-center">
                                Mã OTP đã được gửi đến email của bạn
                            </Text>
                        </View>

                        <OtpInput
                            value={otp}
                            onChangeText={onChangeOtp}
                            error={error}
                            countdown={countdown}
                            onResend={onResend}
                        />

                        {error && (
                            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <Text className="text-red-800 text-sm">{error}</Text>
                            </View>
                        )}

                        <PrimaryButton
                            title="Xác thực"
                            onPress={onVerify}
                            loading={isLoading}
                            disabled={otp.length !== 6 || isLoading}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}