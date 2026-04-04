# OTT Mobile - Landing & Login Pages

## 📁 Cấu trúc đã tạo

### 1. Configuration
- **`.env`**: File cấu hình môi trường
  - API URL, timeout
  - Google OAuth credentials
  - App config
  
- **`configuration/api.ts`**: Export config từ env variables

### 2. Hooks
- **`hooks/useAuth.ts`**: Custom hook quản lý authentication
  - `login()`: Đăng nhập với phone/password
  - `logout()`: Đăng xuất
  - `isLoading`, `error`: State management
  - Tự động lưu token vào AsyncStorage

### 3. Components

#### Landing Components (`components/landing/`)
- **`Hero.tsx`**: Component hero section với gradient background
  - Animation gradient đẹp mắt
  - Call-to-action button
  - Page indicators
  
- **`Features.tsx`**: Component hiển thị tính năng
  - 4 tính năng chính: Nhắn tin, Gọi điện, Video call, Bảo mật
  - Icons từ lucide-react-native
  - Card layout responsive

#### Auth Components (`components/auth/`)
- **`LoginForm.tsx`**: Form đăng nhập
  - Phone input với icon
  - Password input với show/hide toggle
  - Error handling tích hợp
  - Loading state
  - Link đến forgot password & register
  
- **`SocialLogin.tsx`**: Đăng nhập mạng xã hội
  - Google login button
  - Divider "Hoặc đăng nhập với"

### 4. Pages

- **`app/landing.tsx`**: Trang landing page
  - 2 pages: Hero → Features
  - Smooth transition
  - Navigate to login page
  
- **`app/login.tsx`**: Trang đăng nhập
  - Gradient header
  - Keyboard handling
  - ScrollView cho responsive
  - Tích hợp LoginForm + SocialLogin

## 🎨 UI/UX Features

- ✅ Gradient backgrounds (purple theme)
- ✅ Smooth animations
- ✅ Icon system (lucide-react-native)
- ✅ NativeWind styling (TailwindCSS)
- ✅ Keyboard handling
- ✅ Loading states
- ✅ Error handling với Alert
- ✅ Password show/hide toggle

## 🔧 Sử dụng

### 1. Cấu hình .env
```bash
# Cập nhật API URL của bạn
EXPO_PUBLIC_API_URL=http://your-api-url:8080/riff/api

# Cập nhật Google Client ID
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 2. Import và sử dụng

```typescript
// Landing Page
import { Hero, Features } from '../components/landing';

// Login Page
import { LoginForm, SocialLogin } from '../components/auth';

// Hook
import { useAuth } from '../hooks';
```

### 3. Navigation Flow
```
Landing Page → Login Page → Main App
     ↓             ↓
  Features    Register/Forgot Password
```

## 📦 Dependencies đã cài

- ✅ `lucide-react-native` - Icons
- ✅ `@react-native-async-storage/async-storage` - Storage
- ✅ `expo-linear-gradient` - Gradient backgrounds

## 🚀 Next Steps

1. Tạo trang Register
2. Tạo trang Forgot Password
3. Tích hợp Google OAuth
4. Thêm animations với Reanimated
5. Thêm form validation nâng cao
6. Tạo main app screens (Chat, Contacts, Profile)

## 💡 Tips

- Hook `useAuth` tự động handle token storage
- Components đều có TypeScript types đầy đủ
- Responsive với NativeWind
- Có thể dễ dàng customize colors trong TailwindCSS
- Error handling tích hợp sẵn
