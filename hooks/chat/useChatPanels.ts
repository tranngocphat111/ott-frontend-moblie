import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';

export const useChatPanels = () => {
  const [voicePanelVisible, setVoicePanelVisible] = useState(false);
  const [imagePanelVisible, setImagePanelVisible] = useState(false);
  const [emojiPanelVisible, setEmojiPanelVisible] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const hasSelectedMedia = selectedMediaIds.length > 0;

  const clearSelectedMedia = useCallback(() => {
    setSelectedMediaIds([]);
  }, []);

  const toggleVoicePanel = useCallback(() => {
    Keyboard.dismiss();
    setVoicePanelVisible((current) => {
      const next = !current;
      if (next) {
        setImagePanelVisible(false);
        setEmojiPanelVisible(false);
      }
      return next;
    });
  }, []);

  const toggleImagePanel = useCallback(() => {
    Keyboard.dismiss();
    setImagePanelVisible((current) => {
      const next = !current;
      if (next) {
        setVoicePanelVisible(false);
        setEmojiPanelVisible(false);
      }
      setSelectedMediaIds([]);
      return next;
    });
  }, []);

  const closeImagePanel = useCallback(() => {
    setImagePanelVisible(false);
    setSelectedMediaIds([]);
  }, []);

  const toggleEmojiPanel = useCallback(() => {
    Keyboard.dismiss();
    setEmojiPanelVisible((current) => {
      const next = !current;
      if (next) {
        setVoicePanelVisible(false);
        setImagePanelVisible(false);
      }
      return next;
    });
  }, []);

  const toggleSelectMedia = useCallback((assetId: string) => {
    setSelectedMediaIds((current) => (
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    ));
  }, []);

  return {
    voicePanelVisible,
    imagePanelVisible,
    emojiPanelVisible,
    selectedMediaIds,
    hasSelectedMedia,
    setVoicePanelVisible,
    setImagePanelVisible,
    setEmojiPanelVisible,
    setSelectedMediaIds,
    clearSelectedMedia,
    toggleVoicePanel,
    toggleImagePanel,
    toggleEmojiPanel,
    closeImagePanel,
    toggleSelectMedia,
  };
};
