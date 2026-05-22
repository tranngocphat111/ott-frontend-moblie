# Riff Mobile

## Android

Chay app tren may/emulator de dev:

```sh
npm run android
```

Build APK bang EAS cloud, lenh nay se in ra link build. Mo link do de tai file APK:

```sh
npm run build:android
```

Build ban production dang AAB de dua len Google Play:

```sh
npm run build:android:aab
```

Lan dau build EAS co the yeu cau dang nhap Expo va cau hinh credentials.

## Cleanup

Thu muc native `android/` va file APK/AAB local la artifact sinh ra khi build, khong commit vao repo. Neu can build local, Expo se tao lai native project khi chay lenh Android.

```sh
npm run lint
```
