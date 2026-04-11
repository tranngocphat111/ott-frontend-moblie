import React from 'react';
import { Modal, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';

type Props = {
  selectedImage: string | null;
  onClose: () => void;
};

export const ChatImagePreviewModal: React.FC<Props> = ({ selectedImage, onClose }) => {
  return (
    <Modal
      visible={!!selectedImage}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/90 px-4"
        onPress={onClose}
      >
        {selectedImage && (
          <Image
            source={{ uri: selectedImage }}
            className="h-[72%] w-full rounded-3xl"
            contentFit="contain"
            transition={120}
          />
        )}
        <Pressable
          onPress={onClose}
          className="absolute right-5 top-16 h-11 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
