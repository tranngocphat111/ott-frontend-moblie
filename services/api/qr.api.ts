import { apiClient, getDeviceInfo } from './client';
import type {
  ApiResponse,
  QrGenerateRequest,
  QrCodeResponse,
  QrScanRequest,
  QrStatusResponse,
  QrConfirmRequest,
} from '../../types';

export const qrApi = {
  /**
   * Generate QR code for login (Desktop/Web)
   */
  generateQrCode: async (): Promise<ApiResponse<QrCodeResponse>> => {
    const payload: QrGenerateRequest = {
      ...getDeviceInfo(),
    };
    return apiClient.post('/auth/qr/generate', payload);
  },

  /**
   * Scan QR code (Mobile - requires auth)
   */
  scanQrCode: async (qrData: string, location?: string): Promise<ApiResponse<QrStatusResponse>> => {
    const payload: QrScanRequest = {
      qrData,
      location,
      ...getDeviceInfo(),
    };
    return apiClient.post('/auth/qr/scan', payload);
  },

  /**
   * Confirm QR login (Mobile - requires auth)
   */
  confirmQrLogin: async (qrId: string, confirmed: boolean): Promise<ApiResponse<QrStatusResponse>> => {
    const payload: QrConfirmRequest = {
      qrId,
      confirmed,
    };
    return apiClient.post('/auth/qr/confirm', payload);
  },

  /**
   * Check QR code status (Desktop/Web - polling)
   */
  checkQrStatus: async (qrId: string): Promise<ApiResponse<QrStatusResponse>> => {
    return apiClient.get(`/auth/qr/status/${qrId}`);
  },

  /**
   * Cancel QR code
   */
  cancelQrCode: async (qrId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/auth/qr/${qrId}`);
  },
};