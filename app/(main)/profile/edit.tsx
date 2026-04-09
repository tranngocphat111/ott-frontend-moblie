import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { PhotoPickerModal } from '@/components/profile/PhotoPickerModal';
import { useAuth } from '@/contexts/Authcontext';
import { usePhotoManager } from '@/hooks/profile/usePhotoManager';
import { useProfile } from '@/hooks/profile/useProfile';
import type { UserProfileResponse } from '@/types';
import { PhotoType } from '@/types/enums/photo.enum';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Nam', value: 'MALE' },
  { label: 'Nữ', value: 'FEMALE' },
  { label: 'Khác', value: 'OTHER' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile: updateAuthProfile } = useAuth();
  const { updateProfile, isLoading, errors } = useProfile();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [gender, setGender] = useState<Gender>((user?.gender as Gender) || 'OTHER');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [modalType, setModalType] = useState<PhotoType | null>(null);

  const {
    photos, loading, uploadProgress, error,
    fetchPhotos, uploadPhoto, setActive, removePhoto, removeActive,
  } = usePhotoManager();

  const openPhotoModal = (type: PhotoType) => {
    setModalType(type);
    fetchPhotos();
  };

  const handlePhotoSuccess = (profile: UserProfileResponse) => {
    updateAuthProfile(profile);
  };

  const handleActiveChanged = (newUrl: string, type: PhotoType) => {
    if (type === PhotoType.AVATAR) {
      updateAuthProfile({ avatarUrl: newUrl });
    } else {
      updateAuthProfile({ coverUrl: newUrl });
    }
  };

  const handleSave = async () => {
    const success = await updateProfile({
      fullName,
      bio,
      gender,
      dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : undefined,
    });
    if (success) router.back();
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN');
  };

  const genderLabel = GENDER_OPTIONS.find(g => g.value === gender)?.label || 'Khác';

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200 bg-surface-raised">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#694d31" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Cover + Avatar ── */}
          <View className="mb-6">
            {/* Cover */}
            <View className="h-36 relative">
              {user?.coverUrl ? (
                <Image source={{ uri: user.coverUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full bg-brand-300" />
              )}
              <TouchableOpacity
                onPress={() => openPhotoModal(PhotoType.COVER)}
                className="absolute bottom-2 right-3 flex-row items-center bg-black/40 px-3 py-1.5 rounded-xl"
              >
                <Feather name="camera" size={13} color="white" />
                <Text className="text-xs font-semibold text-white ml-1">Đổi ảnh bìa</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar — đè lên cover */}
            <View className="px-6">
              <View className="relative self-start -mt-12">
                <View className="w-24 h-24 rounded-full border-4 border-brand-50 overflow-hidden bg-brand-100">
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full bg-brand-500 justify-center items-center">
                      <Text className="text-white text-3xl font-bold">
                        {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => openPhotoModal(PhotoType.AVATAR)}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-600 justify-center items-center border-2 border-brand-50"
                >
                  <Feather name="camera" size={15} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-brand-400 mt-2">
                Nhấn vào ảnh để thay đổi
              </Text>
            </View>
          </View>

          {/* ── Form ── */}
          <View className="px-6 pb-8">
            <TextInputField
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ và tên"
              error={errors.fullName}
              icon="user"
              required
              autoCapitalize="words"
            />

            <View className="mb-4">
              <Text className="text-sm font-medium text-brand-700 mb-2">Giới thiệu bản thân</Text>
              <View className="border border-brand-200 rounded-2xl px-4 py-3 bg-surface-raised">
                <TextInputField
                  label=""
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Viết vài dòng về bạn..."
                  error={errors.bio}
                  maxLength={200}
                  multiline
                />
              </View>
              <Text className="text-xs text-brand-500 mt-1 text-right">{bio.length}/200</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-brand-700 mb-2">
                Ngày sinh <Text className="text-brand-400 font-normal">(tùy chọn)</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center border border-brand-200 rounded-2xl px-4 py-3 bg-surface-raised"
              >
                <Feather name="calendar" size={18} color="#8b6642" />
                <Text className={`flex-1 ml-3 text-sm ${dateOfBirth ? 'text-brand-900' : 'text-brand-400'}`}>
                  {formatDate(dateOfBirth)}
                </Text>
                {dateOfBirth && (
                  <TouchableOpacity onPress={() => setDateOfBirth(undefined)}>
                    <Feather name="x" size={16} color="#8b6642" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-brand-700 mb-2">Giới tính</Text>
              <TouchableOpacity
                onPress={() => setShowGenderModal(true)}
                className="flex-row items-center border border-brand-200 rounded-2xl px-4 py-3 bg-surface-raised"
              >
                <Feather name="users" size={18} color="#8b6642" />
                <Text className="flex-1 ml-3 text-sm text-brand-900">{genderLabel}</Text>
                <Feather name="chevron-down" size={18} color="#8b6642" />
              </TouchableOpacity>
            </View>

            {errors.general && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <Text className="text-red-700 text-sm">{errors.general}</Text>
              </View>
            )}

            <PrimaryButton
              title={isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              onPress={handleSave}
              loading={isLoading}
              disabled={!fullName || isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (event.type !== 'dismissed' && selectedDate) {
              setDateOfBirth(selectedDate);
              if (Platform.OS === 'android') setShowDatePicker(false);
            } else {
              setShowDatePicker(false);
            }
          }}
        />
      )}

      {/* Gender modal */}
      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setShowGenderModal(false)}
        >
          <View className="bg-surface rounded-t-2xl overflow-hidden border-t border-brand-100">
            <View className="px-6 py-4 border-b border-brand-100">
              <Text className="text-base font-bold text-brand-900">Chọn giới tính</Text>
            </View>
            {GENDER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => { setGender(option.value); setShowGenderModal(false); }}
                className={`flex-row items-center justify-between px-6 py-4 border-b border-brand-100 ${gender === option.value ? 'bg-brand-50' : ''
                  }`}
              >
                <Text className={`text-base ${gender === option.value ? 'text-brand-700 font-semibold' : 'text-brand-900'}`}>
                  {option.label}
                </Text>
                {gender === option.value && <Feather name="check" size={18} color="#8b6642" />}
              </TouchableOpacity>
            ))}
            <View className="px-6 py-4">
              <TouchableOpacity onPress={() => setShowGenderModal(false)} className="py-3 items-center">
                <Text className="text-brand-600 font-medium">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo picker modal */}
      <PhotoPickerModal
        open={modalType !== null}
        type={modalType ?? PhotoType.AVATAR}
        photos={photos}
        loading={loading}
        uploadProgress={uploadProgress}
        error={error}
        onClose={() => setModalType(null)}
        onUpload={uploadPhoto}
        onSetActive={setActive}
        onDelete={removePhoto}
        onRemoveActive={removeActive}
        onSuccess={handlePhotoSuccess}
        onActiveChanged={handleActiveChanged}
      />
    </SafeAreaView>
  );
}