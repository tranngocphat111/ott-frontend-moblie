// utils/logoutHandler.ts
// Singleton lưu logout function từ AuthContext
// Interceptor gọi trực tiếp mà không cần eventemitter

let _logoutFn: (() => Promise<void>) | null = null;

export const setLogoutHandler = (fn: () => Promise<void>) => {
  _logoutFn = fn;
};

export const triggerLogout = async () => {
  console.log('triggerLogout called, handler:', !!_logoutFn);
  if (_logoutFn) {
    await _logoutFn();
  }
};