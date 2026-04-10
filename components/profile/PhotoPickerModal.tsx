import type { UserProfileResponse } from '@/types';
import { PhotoType } from '@/types/enums/photo.enum';
import type { PhotoListResponse, UserPhotoResponse } from '@/types/response/photo.response';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
    open: boolean;
    type: PhotoType;
    photos: PhotoListResponse | null;
    loading: boolean;
    uploadProgress: number | null;
    error: string | null;
    onClose: () => void;
    onUpload: (uri: string, mimeType: string, type: PhotoType) => Promise<UserProfileResponse | null>;
    onSetActive: (photoId: string) => Promise<string | null>;
    onDelete: (photoId: string) => Promise<void>;
    onRemoveActive: (type: PhotoType) => Promise<UserProfileResponse | null>;
    onSuccess?: (profile: UserProfileResponse) => void;
    onActiveChanged?: (newUrl: string, type: PhotoType) => void;
}

export const PhotoPickerModal: React.FC<Props> = ({
    open, type, photos, loading, uploadProgress, error,
    onClose, onUpload, onSetActive, onDelete, onRemoveActive, onSuccess, onActiveChanged,
}) => {
    const [actionLoading, setActionLoading] = useState(false);

    const isAvatar = type === PhotoType.AVATAR;
    const label = isAvatar ? 'ảnh đại diện' : 'ảnh bìa';
    const list = photos ? (isAvatar ? photos.avatars : photos.covers) : [];
    const hasActive = photos
        ? !!(isAvatar ? photos.activeAvatarUrl : photos.activeCoverUrl)
        : false;

    const busy = loading || actionLoading || uploadProgress !== null;

    // Reset actionLoading khi đóng modal
    useEffect(() => {
        if (!open) setActionLoading(false);
    }, [open]);

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.85,
            aspect: isAvatar ? [1, 1] : [16, 9],
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? 'image/jpeg';

        // Kiểm tra dung lượng (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            Alert.alert('Lỗi', 'Ảnh tối đa 5MB');
            return;
        }

        setActionLoading(true);
        const profile = await onUpload(asset.uri, mimeType, type);
        setActionLoading(false);
        if (profile && onSuccess) onSuccess(profile);
    };

    const handleSetActive = async (photoId: string) => {
        setActionLoading(true);
        const newUrl = await onSetActive(photoId);
        setActionLoading(false);
        if (newUrl && onActiveChanged) onActiveChanged(newUrl, type);
    };

    const handleDelete = (photoId: string) => {
        Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa ảnh này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: () => onDelete(photoId),
            },
        ]);
    };

    const handleRemoveActive = () => {
        Alert.alert('Xác nhận', `Đặt lại ${label} về mặc định?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đặt lại',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(true);
                    const profile = await onRemoveActive(type);
                    setActionLoading(false);
                    if (profile && onSuccess) onSuccess(profile);
                },
            },
        ]);
    };

    const renderPhoto = ({ item }: { item: UserPhotoResponse }) => (
        <View className="relative m-1" style={{ width: '30%', aspectRatio: 1 }}>
            <Image
                source={{ uri: item.url }}
                className="w-full h-full rounded-xl"
                resizeMode="cover"
            />

            {/* Active badge */}
            {item.isActive && (
                <View className="absolute top-1 left-1 bg-brand-500 px-1.5 py-0.5 rounded flex-row items-center gap-1">
                    <Feather name="check" size={9} color="white" />
                    <Text className="text-white text-xs font-bold" style={{ fontSize: 9 }}>Đang dùng</Text>
                </View>
            )}

            {/* Action buttons */}
            <View className="absolute bottom-1 right-1 flex-row gap-1">
                {!item.isActive && (
                    <TouchableOpacity
                        onPress={() => handleSetActive(item.id)}
                        disabled={busy}
                        className="w-7 h-7 rounded-lg bg-white justify-center items-center"
                    >
                        <Feather name="check" size={13} color="#694d31" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    disabled={busy}
                    className="w-7 h-7 rounded-lg bg-white justify-center items-center"
                >
                    <Feather name="trash-2" size={13} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {/* Overlay khi đang xử lý */}
            {busy && (
                <View className="absolute inset-0 rounded-xl bg-black/30 justify-center items-center">
                    <ActivityIndicator size="small" color="white" />
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View className="flex-1 bg-brand-50">

                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-brand-100 bg-white">
                    <Text className="text-base font-bold text-brand-900">Quản lý {label}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Feather name="x" size={22} color="#9ca3af" />
                    </TouchableOpacity>
                </View>

                {/* Error banner */}
                {error && (
                    <View className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                        <Text className="text-sm text-red-600">{error}</Text>
                    </View>
                )}

                {/* Upload button + progress */}
                <View className="mx-4 mt-4">
                    {uploadProgress !== null ? (
                        <View className="bg-white border border-brand-100 rounded-2xl p-4">
                            <Text className="text-sm text-brand-600 mb-2 text-center">
                                Đang tải lên... {uploadProgress}%
                            </Text>
                            <View className="h-2 bg-brand-100 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-brand-500 rounded-full"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={handlePickImage}
                            disabled={busy}
                            className="bg-white border-2 border-dashed border-brand-200 rounded-2xl py-5 items-center justify-center"
                        >
                            <Feather name="upload" size={22} color="#bc9166" />
                            <Text className="text-sm font-semibold text-brand-700 mt-2">
                                Tải ảnh mới lên
                            </Text>
                            <Text className="text-xs text-brand-400 mt-1">
                                JPG, PNG, WEBP · Tối đa 5MB
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Gallery header */}
                <View className="flex-row items-center justify-between px-5 mt-5 mb-2">
                    <Text className="text-sm font-semibold text-brand-700">
                        Thư viện ({list.length}/10)
                    </Text>
                    {hasActive && (
                        <TouchableOpacity onPress={handleRemoveActive} disabled={busy} className="flex-row items-center gap-1">
                            <Feather name="rotate-ccw" size={12} color="#ef4444" />
                            <Text className="text-xs text-red-500 font-medium">Đặt lại mặc định</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Gallery */}
                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#bc9166" />
                    </View>
                ) : list.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="image" size={48} color="#d1d5db" />
                        <Text className="text-gray-400 mt-3 text-sm">Chưa có ảnh nào trong thư viện</Text>
                    </View>
                ) : (
                    <FlatList
                        data={list}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPhoto}
                        numColumns={3}
                        className="px-3"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32 }}
                    />
                )}
            </View>
        </Modal>
    );
};