export interface AuthenticationResponse {
  token?: string;
  refreshToken?: string;
  authenticated: boolean;
  requires2FA?: boolean;
  requiresPhoneSetup?: boolean;
  tempToken?: string;
  googleUserInfo?: GoogleUserInfo;
}

export interface IntrospectResponse {
  valid: boolean;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}