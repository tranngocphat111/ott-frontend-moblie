import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';

export const useChatPanels = () => {
  const [voicePanelVisible, setVoicePanelVisible] = useState(false);
  const [imagePanelVisible, setImagePanelVisible] = useState(false);
  const [extraPanelVisible, setExtraPanelVisible] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const hasSelectedMedia = selectedMediaIds.length > 0;

  const clearSelectedMedia = useCallback(() => {
    setSelectedMediaIds([]);
  }, []);

  const closeAllPanels = useCallback((options?: { clearMediaSelection?: boolean }) => {
    setVoicePanelVisible(false);
    setImagePanelVisible(false);
    setExtraPanelVisible(false);
    if (options?.clearMediaSelection !== false) {
      setSelectedMediaIds([]);
    }
  }, []);

  const toggleVoicePanel = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(() => Keyboard.dismiss(), 100);
    setVoicePanelVisible((current) => {
      const next = !current;
      if (next) {
        setImagePanelVisible(false);
        setExtraPanelVisible(false);
      }
      return next;
    });
  }, []);

  const toggleImagePanel = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(() => Keyboard.dismiss(), 100);
    setImagePanelVisible((current) => {
      const next = !current;
      if (next) {
        setVoicePanelVisible(false);
        setExtraPanelVisible(false);
      }
      setSelectedMediaIds([]);
      return next;
    });
  }, []);

  const toggleExtraPanel = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(() => Keyboard.dismiss(), 100);
    setExtraPanelVisible((current) => {
      const next = !current;
      if (next) {
        setVoicePanelVisible(false);
        setImagePanelVisible(false);
      }
      return next;
    });
  }, []);

  const closeExtraPanel = useCallback(() => {
    setExtraPanelVisible(false);
  }, []);

  const closeImagePanel = useCallback(() => {
    setImagePanelVisible(false);
    setSelectedMediaIds([]);
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
    extraPanelVisible,
    selectedMediaIds,
    hasSelectedMedia,
    setVoicePanelVisible,
    setImagePanelVisible,
    setExtraPanelVisible,
    setSelectedMediaIds,
    clearSelectedMedia,
    closeAllPanels,
    toggleVoicePanel,
    toggleImagePanel,
    toggleExtraPanel,
    closeExtraPanel,
    closeImagePanel,
    toggleSelectMedia,
  };
};
