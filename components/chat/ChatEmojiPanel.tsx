import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Props = {
  height: number;
  onAppendEmoji: (emoji: string) => void;
};

export const ChatEmojiPanel: React.FC<Props> = ({ height, onAppendEmoji }) => {
  return (
    <View className="border-t border-slate-200 bg-white px-4 py-3" style={{ height }}>
      <Text className="mb-2 text-[13px] font-semibold text-slate-700">Emoji</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap gap-2 pb-2">
          {['😀', '😂', '😍', '🥰', '😢', '😭', '😡', '👍', '🙏', '❤️', '🔥', '🎉', '😎', '🤔', '🥲', '😴', '🤝', '👏', '💯', '✅'].map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => onAppendEmoji(emoji)}
              className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="text-[22px]">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
