// utils/logoutHandler.ts
// Singleton lưu logout function từ AuthContext
// Interceptor gọi trực tiếp mà không cần eventemitter

let _logoutFn: ((showNotice?: boolean) => Promise<void>) | null = null;

export const setLogoutHandler = (fn: (showNotice?: boolean) => Promise<void>) => {
  _logoutFn = fn;
};

export const triggerLogout = async (showNotice = false) => {
  console.log('triggerLogout called, handler:', !!_logoutFn);
  if (_logoutFn) {
    await _logoutFn(showNotice);
  }
};
