import type { PhotoType } from "../enums/photo.enum";

export interface AddPhotoRequest {
  fileUrl: string;
  s3Key: string;
  photoType: PhotoType;
}