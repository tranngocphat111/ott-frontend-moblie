# OTT Frontend Mobile - AI Coding Agent Instructions

## Project Overview
**Stack**: React Native (Expo) + TypeScript + NativeWind + Expo Router  
**Domain**: Over-The-Top (OTT) streaming platform mobile app with authentication, QR scanning, and device management

## Build & Development Commands
```bash
npm start        # Start Expo development server
npm run android  # Run on Android emulator
npm run ios      # Run on iOS simulator
npm run web      # Run web version (React Native Web)
npm run lint     # ESLint check
npm run reset-project  # Reset project to clean state
```

## Core Architecture Patterns

### 1. Single-File App Structure
Located in `app/index.tsx` (668 lines):
- Main entry point with all core functionality
- Uses React Hooks for state management (no context providers yet)
- Tab-based navigation: 'login', 'scanner', 'profile'
- Core features: Phone/password login, QR code scanning, user profile display
- Persistent token storage via AsyncStorage

**State Pattern**:
```typescript
const [activeTab, setActiveTab] = useState<TabType>('login');
const [token, setToken] = useState<string | null>(null);
const [loginForm, setLoginForm] = useState<LoginForm>({ ... });
```

### 2. API Communication
- **Base URL**: Configured as `API_BASE_URL = 'http://192.168.1.6:8080/riff/api/auth'`
- **Response Format**: `{ result?: T, message?: string, code?: number }`
- **Token Management**: Stored in AsyncStorage for persistence across app sessions
- **Device Tracking**: Custom device ID generation for session management

**Login Response**:
```typescript
interface AuthenticationResponse {
  token: string;
  refreshToken: string;
  authenticated: boolean;
}
```

### 3. Authentication Flows

#### Phone/Password Login
- Input validation for phone and password
- Device metadata sent with login (deviceId, deviceType, deviceName)
- Token stored in AsyncStorage post-login
- Auto-redirect to profile tab on success

#### QR Code Scanner
- Uses `expo-camera` for camera access
- Dynamic permission handling with graceful fallback
- Processes scanned QR code for authentication
- Uses ref-based debouncing to prevent duplicate processing
- API call: `POST /api/auth/qr/scan` with qrData

### 4. UI & Styling
- **NativeWind**: TailwindCSS for React Native (v4 compatible)
- **Styling File**: `global.css` with Tailwind directives
- **Safe Area**: `SafeAreaView` wraps all screens for notch handling
- **Icons**: Expo Vector Icons (`@expo/vector-icons`) for tab/action icons
- **Status Bar**: `StatusBar` configured for app-wide consistency

### 5. Styling Pattern
NativeWind enables Tailwind classes directly in React Native:
```tsx
<View className="flex-1 bg-gray-900 justify-center">
  <Text className="text-white text-lg font-bold">Login</Text>
</View>
```

### 6. Component Structure
Located in `components/`:
- **UI Components**: `themed-text.tsx`, `themed-view.tsx` for consistent theming
- **Layout Components**: `parallax-scroll-view.tsx` for scrollable content
- **Interactive**: `haptic-tab.tsx`, `external-link.tsx` for user feedback
- **Utilities**: Reusable components for spacing, colors, and animations

**Theming Pattern**:
```tsx
<ThemedView className="bg-light dark:bg-dark">
  <ThemedText className="text-light-text dark:text-dark-text">
    Content
  </ThemedText>
</ThemedView>
```

### 7. Asset Management
- **Images**: `assets/images/` for app graphics
- **Icons**: Expo Vector Icons (Font Awesome, Material Icons, etc.)
- **Constants**: `constants/theme.ts` for color/size constants

## Key File Locations & Patterns

| Task | File | Pattern |
|------|------|---------|
| Add new tab feature | `app/index.tsx` | Add TabType, state hook, handler function, tab case in render |
| Add API endpoint | `app/index.tsx` | Add fetch call with `API_BASE_URL`, handle response, store token if auth |
| Add theme colors | `constants/theme.ts` | Update color palette, use in themed components with conditional className |
| Create reusable component | `components/[Name].tsx` | Use ThemedView/ThemedText, accept `className` prop for Tailwind |
| Camera permission | `app/index.tsx` | Use `expo-camera` with permission check, show fallback UI |

## Important Conventions

1. **Async Storage Usage**: Always wrap in try-catch
   ```typescript
   const token = await AsyncStorage.getItem('token');
   if (token) { /* use token */ }
   ```

2. **Alert Handling**: Use native `Alert.alert()` for user feedback (no toast library)
   ```typescript
   Alert.alert('Error', 'Login failed');
   ```

3. **Camera Permission Flow**: Check status before rendering CameraView
   ```typescript
   if (hasPermission === null) return <Text>Requesting permission...</Text>;
   if (hasPermission === false) return <Text>No camera access</Text>;
   ```

4. **Debouncing QR Scans**: Use ref to prevent duplicate processing
   ```typescript
   if (processingRef.current) return;
   processingRef.current = true;
   ```

5. **Device ID Generation**: Always include for session tracking
   ```typescript
   deviceId: 'mobile-' + Math.random().toString(36).substr(2, 9)
   ```

6. **NativeWind Styling**: Combine Tailwind with React Native props
   ```tsx
   <TouchableOpacity onPress={handlePress} className="p-4 bg-blue-500 rounded">
     <Text className="text-white font-bold">Button</Text>
   </TouchableOpacity>
   ```

## Testing & Quality
- ESLint config: `eslint.config.js` (Expo-aware)
- Type checking: TypeScript strict mode (`tsconfig.json`)
- Metro bundler: Configured in `metro.config.js` with NativeWind support
- Babel: Configured for React Native, Reanimated, and JSX/NativeWind

## Common Tasks
- **Add new tab**: Add to TabType, create state handlers, add tab button + render case
- **Call API**: Use `fetch()` with proper error handling and token management
- **Store data**: Use `AsyncStorage.setItem()` for persistence
- **Show message**: Use `Alert.alert()` for alerts (no toast notifications)
- **Add styling**: Use NativeWind Tailwind classes in `className` prop
- **Handle permissions**: Check status from platform permission APIs (Camera, Location, etc.)

## Key Dependencies
- **expo-router**: File-based routing (when migrating from single file)
- **expo-camera**: Camera/QR scanning
- **@react-native-async-storage/async-storage**: Persistent storage
- **nativewind**: Tailwind CSS for React Native
- **react-native-reanimated**: Advanced animations
- **@react-navigation/bottom-tabs**: Tab navigation

## Architecture Notes
- Currently monolithic (`app/index.tsx`): Consider Expo Router migration for scaling
- API_BASE_URL hardcoded: Extract to env config file for multi-environment support
- AsyncStorage as sole state persistence: Consider Redux/Zustand for complex app state
- No context providers: May need auth/theme context as features expand