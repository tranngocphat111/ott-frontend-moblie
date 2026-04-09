import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  getAllPhotos,
  fullUploadFlow,
  setActiveFromGallery,
  deletePhoto,
  removeActiveAvatar,
  removeActiveCover,
} from '@/services/api/photo.api';
import { PhotoType } from '@/types/enums/photo.enum';
import type { PhotoListResponse, UserPhotoResponse } from '@/types/response/photo.response';
import type { UserProfileResponse } from '@/types';

interface UsePhotoManagerReturn {
  photos: PhotoListResponse | null;
  loading: boolean;
  uploadProgress: number | null;
  error: string | null;
  fetchPhotos: () => Promise<void>;
  uploadPhoto: (uri: string, mimeType: string, type: PhotoType) => Promise<UserProfileResponse | null>;
  setActive: (photoId: string) => Promise<string | null>;
  removePhoto: (photoId: string) => Promise<void>;
  removeActive: (type: PhotoType) => Promise<UserProfileResponse | null>;
  clearError: () => void;
}

export const usePhotoManager = (): UsePhotoManagerReturn => {
  const [photos, setPhotos] = useState<PhotoListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPhotos();
      setPhotos(data);
    } catch (e: any) {
      const msg = e?.message || 'Không tải được danh sách ảnh';
      setError(msg);
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = useCallback(
    async (uri: string, mimeType: string, type: PhotoType): Promise<UserProfileResponse | null> => {
      setError(null);
      setUploadProgress(0);
      try {
        const { profile } = await fullUploadFlow(uri, mimeType, type, setUploadProgress);
        await fetchPhotos();
        Alert.alert('Thành công', 'Tải ảnh lên thành công');
        return profile;
      } catch (e: any) {
        const msg = e?.message || 'Upload ảnh thất bại';
        setError(msg);
        Alert.alert('Lỗi', msg);
        return null;
      } finally {
        setUploadProgress(null);
      }
    },
    [fetchPhotos]
  );

  const setActive = useCallback(
    async (photoId: string): Promise<string | null> => {
      setError(null);
      try {
        const res = await setActiveFromGallery(photoId);

        // Optimistic update giống web
        setPhotos((prev) => {
          if (!prev) return prev;
          const isAvatar = prev.avatars.some((p) => p.id === photoId);
          const updateList = (list: UserPhotoResponse[]) =>
            list.map((p) => ({ ...p, isActive: p.id === photoId }));
          return isAvatar
            ? {
                ...prev,
                avatars: updateList(prev.avatars),
                activeAvatarUrl: prev.avatars.find((p) => p.id === photoId)?.url ?? prev.activeAvatarUrl,
              }
            : {
                ...prev,
                covers: updateList(prev.covers),
                activeCoverUrl: prev.covers.find((p) => p.id === photoId)?.url ?? prev.activeCoverUrl,
              };
        });

        return res.url;
      } catch (e: any) {
        const msg = e?.message || 'Không thể đặt ảnh làm mặc định';
        setError(msg);
        Alert.alert('Lỗi', msg);
        await fetchPhotos(); // rollback
        return null;
      }
    },
    [fetchPhotos]
  );

  const removePhoto = useCallback(
    async (photoId: string): Promise<void> => {
      setError(null);
      const oldPhotos = photos;
      // Optimistic remove
      setPhotos((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          avatars: prev.avatars.filter((p) => p.id !== photoId),
          covers: prev.covers.filter((p) => p.id !== photoId),
        };
      });
      try {
        await deletePhoto(photoId);
        await fetchPhotos();
      } catch (e: any) {
        const msg = e?.message || 'Xóa ảnh thất bại';
        setError(msg);
        Alert.alert('Lỗi', msg);
        setPhotos(oldPhotos); // rollback
      }
    },
    [fetchPhotos, photos]
  );

  const removeActive = useCallback(
    async (type: PhotoType): Promise<UserProfileResponse | null> => {
      setError(null);
      try {
        const profile =
          type === PhotoType.AVATAR ? await removeActiveAvatar() : await removeActiveCover();
        await fetchPhotos();
        return profile;
      } catch (e: any) {
        const msg = e?.message || 'Không thể gỡ ảnh đang sử dụng';
        setError(msg);
        Alert.alert('Lỗi', msg);
        return null;
      }
    },
    [fetchPhotos]
  );

  return {
    photos, loading, uploadProgress, error,
    fetchPhotos, uploadPhoto, setActive, removePhoto, removeActive, clearError,
  };
};