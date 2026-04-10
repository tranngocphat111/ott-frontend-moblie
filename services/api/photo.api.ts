import { apiClient } from './client';
import type {
  PhotoListResponse,
  PresignedUrlResponse,
  UserPhotoResponse,
} from '../../types/response/photo.response';
import type { AddPhotoRequest } from '../../types/request/photo.request';
import type { ApiResponse } from '../../types';
import type { UserProfileResponse } from '../../types';
import { PhotoType } from '../../types/enums/photo.enum';


export const getPresignedUrl = async (
  filename: string,
  type: PhotoType
): Promise<PresignedUrlResponse> => {
  const res = await (apiClient.get as any)('/users/photos/presigned-url', {
    params: { filename, type },
  }) as ApiResponse<PresignedUrlResponse>;
  return res.result!;
};

// ─── 2. Upload file lên S3 trực tiếp (React Native dùng fetch + uri) ─────────

export const uploadFileToS3 = async (
  uploadUrl: string,
  uri: string,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> => {
  const response = await fetch(uri);
  const blob = await response.blob();

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  }).then((res) => {
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
  });

  onProgress?.(100);
};



export const getAllPhotos = async (): Promise<PhotoListResponse> => {
  const res = await (apiClient.get as any)('/users/photos') as ApiResponse<PhotoListResponse>;
  return res.result!;
};

export const addPhotoToGallery = async (
  body: AddPhotoRequest
): Promise<UserPhotoResponse> => {
  const res = await (apiClient.post as any)('/users/photos', body) as ApiResponse<UserPhotoResponse>;
  return res.result!;
};

export const deletePhoto = async (photoId: string): Promise<void> => {
  await (apiClient.delete as any)(`/users/photos/${photoId}`);
};

// ─── 4. Set active từ gallery ─────────────────────────────────────────────────

export const setActiveFromGallery = async (
  photoId: string
): Promise<UserPhotoResponse> => {
  const res = await (apiClient.patch as any)(
    `/users/photos/${photoId}/active`
  ) as ApiResponse<UserPhotoResponse>;
  return res.result!;
};

// ─── 5. Upload mới + set active (avatar / cover) ─────────────────────────────

export const uploadAndSetAvatar = async (
  body: AddPhotoRequest
): Promise<UserProfileResponse> => {
  const res = await (apiClient.patch as any)(
    '/users/photos/avatar', body
  ) as ApiResponse<UserProfileResponse>;
  return res.result!;
};

export const uploadAndSetCover = async (
  body: AddPhotoRequest
): Promise<UserProfileResponse> => {
  const res = await (apiClient.patch as any)(
    '/users/photos/cover', body
  ) as ApiResponse<UserProfileResponse>;
  return res.result!;
};

// ─── 6. Remove active (reset về default) ─────────────────────────────────────

export const removeActiveAvatar = async (): Promise<UserProfileResponse> => {
  const res = await (apiClient.delete as any)(
    '/users/photos/avatar'
  ) as ApiResponse<UserProfileResponse>;
  return res.result!;
};

export const removeActiveCover = async (): Promise<UserProfileResponse> => {
  const res = await (apiClient.delete as any)(
    '/users/photos/cover'
  ) as ApiResponse<UserProfileResponse>;
  return res.result!;
};

// ─── 7. Full upload flow ──────────────────────────────────────────────────────
// Mobile nhận uri + mimeType từ image picker thay vì File object

export interface UploadPhotoResult {
  profile: UserProfileResponse;
}

export const fullUploadFlow = async (
  uri: string,
  mimeType: string,
  type: PhotoType,
  onProgress?: (percent: number) => void
): Promise<UploadPhotoResult> => {
  // Lấy filename từ uri
  const filename = uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;

  // Bước 1: lấy presigned URL
  const { uploadUrl, fileUrl, s3Key, contentType } =
    await getPresignedUrl(filename, type);

  // Bước 2: upload lên S3
  await uploadFileToS3(uploadUrl, uri, contentType ?? mimeType, onProgress);

  // Bước 3: gọi backend
  const body: AddPhotoRequest = { fileUrl, s3Key, photoType: type };

  const profile =
    type === PhotoType.AVATAR
      ? await uploadAndSetAvatar(body)
      : await uploadAndSetCover(body);

  return { profile };
};