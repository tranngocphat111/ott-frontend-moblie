export { apiClient, chatApiClient, getDeviceInfo } from './client';
export { authApi } from './auth.api';
export { userApi } from './user.api';
export { otpApi } from './otp.api';
export { accountApi } from './account.api';
export { linkingApi } from './linking.api';
export { profileApi } from './profile.api';
export { qrApi } from './qr.api';
export { sessionApi } from './session.api';
export { twoFactorApi } from './twoFactor.api';
export { ChatApi } from './chat';
export type {
	ChatCategory,
	ChatLinkMessage,
	ChatMessageContextResponse,
	ChatSearchResult,
	ChatServiceUser,
	SendMessagePayload,
} from './chat';
export { chatSocket } from '@/services/socket/chatSocket';