import type { PhotoType } from "../enums/photo.enum";

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  s3Key: string;
  expiresInMinutes: number;
  contentType: string;
}
 
export interface UserPhotoResponse {
  id: string;
  url: string;
  s3Key: string;
  photoType: PhotoType;
  isActive: boolean;
  createdAt: string;
}
 
export interface PhotoListResponse {
  avatars: UserPhotoResponse[];
  covers: UserPhotoResponse[];
  activeAvatarUrl: string | null;
  activeCoverUrl: string | null;
}