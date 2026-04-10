import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, duration, radius, shadows } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastCtx {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

// ─── Token maps (tương đồng với index.css) ────────────────────────────────────

const TOAST_COLORS: Record<ToastType, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  messageColor: string;
}> = {
  success: {
    bg:           colors.success.bg,
    border:       colors.success.border,
    iconBg:       colors.success.bg,
    iconColor:    colors.success.text,
    titleColor:   colors.primary[900],
    messageColor: colors.primary[700],
  },
  error: {
    bg:           colors.error.bg,
    border:       colors.error.border,
    iconBg:       colors.error.bg,
    iconColor:    colors.error.text,
    titleColor:   colors.primary[900],
    messageColor: colors.primary[700],
  },
  warning: {
    bg:           colors.warning.bg,
    border:       colors.warning.border,
    iconBg:       colors.warning.bg,
    iconColor:    colors.warning.text,
    titleColor:   colors.primary[900],
    messageColor: colors.primary[700],
  },
  info: {
    bg:           colors.info.bg,
    border:       colors.info.border,
    iconBg:       colors.info.bg,
    iconColor:    colors.info.text,
    titleColor:   colors.primary[900],
    messageColor: colors.primary[700],
  },
};

const ICONS: Record<ToastType, React.ComponentProps<typeof Feather>['name']> = {
  success: 'check-circle',
  error:   'x-circle',
  info:    'info',
  warning: 'alert-circle',
};

// ─── ToastItem ────────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const translateX = useRef(new Animated.Value(400)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scheme     = TOAST_COLORS[toast.type];

  useEffect(() => {
    // Slide in từ phải (tương đương toastIn CSS)
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.slow,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = useCallback(() => {
    // Slide out (tương đương toastOut CSS)
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 400,
        duration: duration.base,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration.base,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  }, [toast.id, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: scheme.bg,
          borderLeftColor: scheme.border,
          transform: [{ translateX }],
          opacity,
          ...shadows.lg,
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.icon, { backgroundColor: scheme.iconBg }]}>
        <Feather name={ICONS[toast.type]} size={14} color={scheme.iconColor} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {toast.title && (
          <Text style={[styles.title, { color: scheme.titleColor }]}>
            {toast.title}
          </Text>
        )}
        <Text style={[styles.message, { color: scheme.messageColor }]}>
          {toast.message}
        </Text>
      </View>

      {/* Close */}
      <TouchableOpacity onPress={handleDismiss} style={styles.close} hitSlop={8}>
        <Feather name="x" size={14} color={colors.primary[400]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const insets                = useSafeAreaInsets();

  const dismiss = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    title?: string,
    dur = 4500,
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(p => [...p, { id, type, message, title, duration: dur }]);
    setTimeout(() => dismiss(id), dur);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[
          styles.container,
          { bottom: insets.bottom + 16 },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position:  'absolute',
    right:     16,
    left:      16,
    gap:       10,
    zIndex:    9999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    padding:        14,
    borderRadius:   radius.md,
    borderLeftWidth: 4,
    gap:            12,
    overflow:       'hidden',
  },
  icon: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginTop:      1,
  },
  body: {
    flex:    1,
    minWidth: 0,
  },
  title: {
    fontSize:   14,
    fontWeight: '600',
    lineHeight: 20,
  },
  message: {
    fontSize:   13,
    lineHeight: 19,
    marginTop:  2,
  },
  close: {
    width:          22,
    height:         22,
    borderRadius:   4,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
});