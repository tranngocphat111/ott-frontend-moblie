export type AudioResetHandler = () => void | Promise<void>;

const handlers = new Map<string, AudioResetHandler>();

export const registerAudioPlaybackHandler = (id: string, handler: AudioResetHandler) => {
  handlers.set(id, handler);

  return () => {
    handlers.delete(id);
  };
};

export const resetOtherAudioPlaybacks = async (activeId: string) => {
  const tasks: Promise<void>[] = [];

  handlers.forEach((handler, id) => {
    if (id === activeId) return;
    try {
      tasks.push(Promise.resolve(handler()));
    } catch {
      tasks.push(Promise.resolve());
    }
  });

  await Promise.all(tasks);
};
