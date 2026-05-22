import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SOCIAL_COLORS, SOCIAL_SHADOW } from './socialTheme';

export type SocialConfirmAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: keyof typeof Feather.glyphMap;
  actions: SocialConfirmAction[];
  onClose: () => void;
};

export function SocialConfirmModal({
  visible,
  title,
  message,
  icon = 'alert-circle',
  actions,
  onClose,
}: Props) {
  const runAction = (action: SocialConfirmAction) => {
    onClose();
    void action.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(28,20,14,0.48)' }} onPress={onClose}>
        <Pressable
          className="w-full max-w-[360px] rounded-[22px] border px-5 pb-5 pt-6"
          style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border, ...SOCIAL_SHADOW }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
              <Feather name={icon} size={25} color={SOCIAL_COLORS.primaryDark} />
            </View>
            <Text className="mt-4 text-center text-[20px] font-black" style={{ color: SOCIAL_COLORS.text }}>
              {title}
            </Text>
            {message ? (
              <Text className="mt-2 text-center text-[14px] font-medium leading-5" style={{ color: SOCIAL_COLORS.textMuted }}>
                {message}
              </Text>
            ) : null}
          </View>

          <View className="mt-5 gap-2">
            {actions.map((action) => {
              const variant = action.variant || 'secondary';
              const isPrimary = variant === 'primary';
              const isDanger = variant === 'danger';
              return (
                <TouchableOpacity
                  key={action.label}
                  className="h-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: isDanger
                      ? '#ef4444'
                      : isPrimary
                        ? SOCIAL_COLORS.primaryDark
                        : SOCIAL_COLORS.chipLight,
                  }}
                  activeOpacity={0.85}
                  onPress={() => runAction(action)}
                >
                  <Text
                    className="text-[15px] font-black"
                    style={{ color: isDanger || isPrimary ? '#fff' : SOCIAL_COLORS.text }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
