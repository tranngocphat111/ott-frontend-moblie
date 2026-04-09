import { useState, useCallback } from 'react';
import {
  getAllPhotos,
  deletePhoto,
  setActiveFromGallery,
  removeActiveAvatar,
  removeActiveCover,
  fullUploadFlow,
} from '../services/api/photo.api';
import { PhotoType } from '../types/enums/photo.enum';
import type { PhotoListResponse, UserPhotoResponse } from '../types/response/photo.response';
import type { UserProfileResponse } from '../types/response/user.response';
import { useToast } from '../contexts/ToastContext'; 
import { getErrorMessage } from '../utils/messageMapping'; 

interface UsePhotoManagerReturn {
  photos: PhotoListResponse | null;
  loading: boolean;
  uploadProgress: number | null;
  error: string | null;

  fetchPhotos: () => Promise<void>;
  uploadPhoto: (file: File, type: PhotoType) => Promise<UserProfileResponse | null>;
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

  const { showToast } = useToast();

  const clearError = useCallback(() => setError(null), []);

  /**
   * Helper xử lý hiển thị lỗi tập trung
   */
  const handleCatchError = useCallback((e: any, defaultMsg: string) => {
    const msg = getErrorMessage(e) || defaultMsg;
    setError(msg);
    showToast(msg, 'error', 'Lỗi');
  }, [showToast]);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPhotos();
      setPhotos(data);
    } catch (e: any) {
      handleCatchError(e, 'Không tải được danh sách ảnh');
    } finally {
      setLoading(false);
    }
  }, [handleCatchError]);

  const uploadPhoto = useCallback(
    async (file: File, type: PhotoType): Promise<UserProfileResponse | null> => {
      setError(null);
      setUploadProgress(0);
      try {
        const { profile } = await fullUploadFlow(file, type, setUploadProgress);
        await fetchPhotos();
        showToast('Tải ảnh lên thành công', 'success');
        return profile;
      } catch (e: any) {
        handleCatchError(e, 'Upload ảnh thất bại');
        return null;
      } finally {
        setUploadProgress(null);
      }
    },
    [fetchPhotos, handleCatchError, showToast]
  );

  const setActive = useCallback(
    async (photoId: string): Promise<string | null> => {
      setError(null);
      try {
        const res = await setActiveFromGallery(photoId);
        
        // Optimistic Update: Cập nhật UI ngay lập tức
        setPhotos((prev) => {
          if (!prev) return prev;
          const updateList = (list: UserPhotoResponse[]) =>
            list.map((p) => ({ ...p, isActive: p.id === photoId }));
          
          const isAvatar = prev.avatars.some((p) => p.id === photoId);
          
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

        showToast('Đã thay đổi ảnh đại diện/bìa', 'success');
        return res.url; 
      } catch (e: any) {
        handleCatchError(e, 'Không thể đặt ảnh làm mặc định');
        await fetchPhotos(); // Rollback dữ liệu nếu lỗi
        return null;
      }
    },
    [fetchPhotos, handleCatchError, showToast]
  );

  const removePhoto = useCallback(
    async (photoId: string): Promise<void> => {
      setError(null);
      // Xóa tạm thời ở UI để tăng trải nghiệm người dùng
      const oldPhotos = photos;
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
        showToast('Đã xóa ảnh thành công', 'success');
        await fetchPhotos(); 
      } catch (e: any) {
        handleCatchError(e, 'Xóa ảnh thất bại');
        setPhotos(oldPhotos); // Trả lại data cũ nếu xóa lỗi
      }
    },
    [fetchPhotos, handleCatchError, showToast, photos]
  );

  const removeActive = useCallback(
    async (type: PhotoType): Promise<UserProfileResponse | null> => {
      setError(null);
      try {
        const profile =
          type === PhotoType.AVATAR ? await removeActiveAvatar() : await removeActiveCover();
        
        await fetchPhotos();
        showToast('Đã gỡ ảnh hiện tại', 'info');
        return profile;
      } catch (e: any) {
        handleCatchError(e, 'Không thể gỡ ảnh đang sử dụng');
        return null;
      }
    },
    [fetchPhotos, handleCatchError, showToast]
  );

  return {
    photos, loading, uploadProgress, error,
    fetchPhotos, uploadPhoto, setActive, removePhoto, removeActive, clearError,
  };
};