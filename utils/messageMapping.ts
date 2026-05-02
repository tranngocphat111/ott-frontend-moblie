export const SUCCESS_MESSAGES = {
  LOGIN: "Đăng nhập thành công! Chào mừng bạn quay lại.",
  REGISTER: "Đăng ký thành công! Đang chuyển hướng...",
  OTP_SENT: "Mã OTP đã được gửi đến email của bạn.",
  OTP_RESENT: "Mã OTP mới đã được gửi đi.",
  VERIFY_SUCCESS: "Xác thực thành công.",
  TWO_FA_ENABLED: "Bật xác thực 2 bước thành công.",
  TWO_FA_DISABLED: "Tắt xác thực 2 bước thành công.",
};

export const VALIDATION_MESSAGES: Record<string, string> = {
  INVALID_PHONE_FORMAT: "Số điện thoại không hợp lệ",
  INVALID_EMAIL_FORMAT: "Email không hợp lệ",
  FULL_NAME_REQUIRED: "Vui lòng nhập họ và tên",
  PHONE_AND_EMAIL_REQUIRED: "Vui lòng nhập cả số điện thoại và email",
};

export const ERROR_MESSAGES: Record<number, string> = {


  9999: "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
  1000: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu.",
  1001: "Bạn không có quyền thực hiện hành động này.",
  1002: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.",
  1006: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.",
  1007: "Bạn không có quyền thực hiện hành động này.",     
  1008: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu.", 
  9998: "Lỗi kết nối hệ thống nội bộ. Vui lòng thử lại sau.",


  1100: "Tài khoản không tồn tại.",
  1101: "Tài khoản chưa được kích hoạt.",
  1102: "Tài khoản của bạn đã bị khóa tạm thời.",
  1103: "Tài khoản này đã bị xóa.",
  6099: "Tài khoản này có thể được khôi phục. Vui lòng liên hệ hỗ trợ.",


  1003: "Tài khoản chưa được kích hoạt.",  
  1004: "Tài khoản của bạn đã bị khóa tạm thời.",
  1005: "Tài khoản này đã bị xóa.",       
  1009: "Tài khoản này có thể được khôi phục. Vui lòng liên hệ hỗ trợ.", 

  // ========== AUTHENTICATION (user-service) ==========
  1200: "Thông tin đăng nhập không chính xác.",
  1201: "Tài khoản chưa có mật khẩu. Vui lòng đăng nhập bằng Google hoặc tạo mật khẩu mới.",
  1202: "Tài khoản này đã được đặt mật khẩu từ trước.",
  1203: "Mật khẩu hiện tại không chính xác.",
  1204: "Mật khẩu mới phải khác với mật khẩu cũ.",
  1205: "Vui lòng nhập mật khẩu.",

  // ========== AUTHENTICATION (auth-service) ==========
  2001: "Mật khẩu không chính xác.",
  2002: "Tài khoản này đã được đặt mật khẩu từ trước.",
  2003: "Mật khẩu không hợp lệ. Vui lòng kiểm tra lại.",
  2004: "Mật khẩu mới phải khác với mật khẩu cũ.",
  2005: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  2006: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

  // ========== SESSION ==========
  1800: "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.", // user-service
  7001: "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.", // auth-service

  // ========== VALIDATION (user-service) ==========
  1300: "Định dạng số điện thoại không hợp lệ.",
  1301: "Định dạng email không hợp lệ.",
  1302: "Mật khẩu phải có ít nhất 8 ký tự.",
  1303: "Họ và tên phải từ 1 đến 100 ký tự.",
  1304: "Ngày sinh không hợp lệ.",
  1305: "Đường dẫn ảnh đại diện không hợp lệ.",
  1306: "Đường dẫn ảnh bìa không hợp lệ.",
  1307: "Tiểu sử không được vượt quá 500 ký tự.",
  1308: "Vui lòng nhập họ và tên.",
  1070: "Vui lòng cung cấp cả số điện thoại và email.",
  1071: "Số điện thoại không khớp với dữ liệu hệ thống.",
  1404: "Email không khớp với dữ liệu hệ thống.",
  1406: "Vui lòng nhập địa chỉ email.",
  1111: "Dữ liệu nhập vào không hợp lệ.",

  // ========== VALIDATION (auth-service) ==========
  5001: "Định dạng số điện thoại không hợp lệ.",
  5002: "Định dạng email không hợp lệ.",
  5003: "Vui lòng cung cấp cả số điện thoại và email.",
  5004: "Vui lòng nhập họ và tên.",
  5005: "Họ và tên không hợp lệ.",

  // ========== DUPLICATE / CONFLICT (user-service) ==========
  1400: "Số điện thoại này đã được đăng ký cho tài khoản khác.",
  1401: "Địa chỉ email này đã được đăng ký cho tài khoản khác.",
  1402: "Số điện thoại này đã được liên kết với một tài khoản khác.",
  1403: "Email này đã được liên kết với một tài khoản khác.",
  2100: "Email mới phải khác với email hiện tại.",
  2101: "Số điện thoại mới phải khác với số điện thoại hiện tại.",

  // ========== DUPLICATE / CONFLICT (auth-service) ==========
  3001: "Số điện thoại này đã được đăng ký cho tài khoản khác.",
  3002: "Địa chỉ email này đã được đăng ký cho tài khoản khác.",
  3003: "Tài khoản Google này đã được liên kết với một tài khoản khác.",

  // ========== OTP (user-service) ==========
  1500: "Mã OTP không tồn tại hoặc đã hết hạn.",
  1501: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
  1502: "Mã OTP này đã được sử dụng.",
  1503: "Mã OTP không hợp lệ.",
  1504: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.",
  1506: "Tính năng xác thực OTP tạm thời bị khóa do yêu cầu quá nhiều.",
  1234: "Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau.",

  // ========== OTP (auth-service) ==========
  4001: "Mã OTP không tồn tại hoặc đã hết hạn.",
  4002: "Mã OTP này đã được sử dụng.",
  4003: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
  4004: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.",
  4005: "Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau.",
  4006: "Mã OTP không hợp lệ.",

  // ========== OTP (notification-service) ==========
  1505: "Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau.",

  // ========== 2FA ==========
  1601: "Xác thực 2 bước đã được bật từ trước.",
  1602: "Xác thực 2 bước hiện chưa được bật.",

  // ========== GOOGLE ==========
  6001: "Xác thực Google thất bại. Vui lòng thử lại.",
  6002: "Mã xác thực Google không hợp lệ.",

  // ========== QR CODE ==========
  8001: "Không tìm thấy mã QR.",
  8002: "Mã QR đã hết hạn. Vui lòng tạo mã mới.",
  8003: "Mã QR không hợp lệ.",
  8004: "Mã QR này đã được quét và sử dụng.",
  8005: "Trạng thái mã QR không hợp lệ.",
  8006: "Yêu cầu cung cấp ID thiết bị.",
  8007: "Quá nhiều yêu cầu đăng nhập bằng QR đang chờ xử lý.",

  // ========== EMAIL ==========
  9001: "Lỗi hệ thống: Không thể gửi email. Vui lòng thử lại sau.", // user-service
  2000: "Lỗi hệ thống: Không thể gửi email. Vui lòng thử lại sau.", // notification-service

  // ========== BACKUP CODE ==========
  1235: "Backup code đã hết.",
  1236: "Mã backup code không hợp lệ.",
  9997: "Mã backup code không hợp lệ.", // auth-service
};

import { AxiosError } from "axios";
import type { ApiResponse } from "../types";

export const getErrorMessage = (error: unknown): string => {
  const apiError = error as { code?: number; message?: string; details?: ApiResponse<unknown> };

  // Lấy code và result từ details (plain object được throw từ interceptor)
  const code = apiError?.details?.code ?? apiError?.code;
  const result = apiError?.details?.result;

  // Validation error (code 1111) — result chứa map field: errorKey
  if (code === 1111 && result) {
    const fieldErrors = result as Record<string, string>;
    const messages = Object.values(fieldErrors)
      .map((msg) => VALIDATION_MESSAGES[msg] || msg)
      .filter(Boolean)
      .join(", ");
    return messages || "Dữ liệu nhập vào không hợp lệ.";
  }

  // Message-based validation fallback
  const message = apiError?.details?.message ?? apiError?.message;
  if (message && VALIDATION_MESSAGES[message]) {
    return VALIDATION_MESSAGES[message];
  }

  // OTP với remaining attempts
  if (code === 1503 && result) {
    const remaining = (result as { remainingAttempts?: number }).remainingAttempts;
    if (remaining !== undefined) {
      return `Mã OTP không hợp lệ. Còn ${remaining} lần thử.`;
    }
  }
  if (code === 4006 && result) {
    const remaining = (result as { remainingAttempts?: number }).remainingAttempts;
    if (remaining !== undefined) {
      return `Mã OTP không hợp lệ. Còn ${remaining} lần thử.`;
    }
  }

  if (code) {
    return ERROR_MESSAGES[code] || "Đã có lỗi xảy ra.";
  }

  // Fallback cho AxiosError thuần (network error)
  const axiosErr = error as AxiosError;
  if (axiosErr.message === "Network Error") {
    return "Không thể kết nối đến máy chủ.";
  }

  return "Đã có lỗi xảy ra.";
};