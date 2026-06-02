import React from 'react';
import { Text, StyleSheet, type TextStyle } from 'react-native';
import { THEME_COLORS } from '@/constants/theme';
import { useRouter } from 'expo-router';

interface Props {
  content?: string | null;
  style?: TextStyle | TextStyle[];
  tagStyle?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

const MENTION_RE = /@\[(.*?)\]\(([A-Za-z0-9_-]+)\)|@([A-Za-z0-9_.-]+)/g;
const HASHTAG_RE = /#([A-Za-z0-9_.-]+)/g;

export default function TextTagRenderer({
  content,
  style,
  tagStyle,
  numberOfLines,
}: Props) {
  const router = useRouter();
  if (!content) return null;

  const parts: React.ReactNode[] = [];
  let idx = 0;
  const combined = new RegExp(`${MENTION_RE.source}|${HASHTAG_RE.source}`, 'g');
  let match: RegExpExecArray | null;

  while ((match = combined.exec(content)) !== null) {
    const start = match.index;
    if (start > idx) {
      parts.push(content.substring(idx, start));
    }
    const full = match[0];
    if (full.startsWith('@')) {
      const displayName = match[1] || match[3];
      const linkTarget = match[2] || match[3];
      const isBracketFormat = !!match[1];

      parts.push(
        <Text
          key={`m-${start}`}
          style={[styles.tag, tagStyle]}
          onPress={async () => {
            if (isBracketFormat) {
              router.push(`/social/profile/${linkTarget}`);
            } else {
              try {
                const user = await import('@/services/api/media.api').then(m => m.MediaApi.fetchUserByUsername(linkTarget));
                if (user) {
                  router.push(`/social/profile/${user.id}`);
                } else {
                  router.push(`/social/search?q=${encodeURIComponent('@' + linkTarget)}`);
                }
              } catch {
                router.push(`/social/search?q=${encodeURIComponent('@' + linkTarget)}`);
              }
            }
          }}
        >
          {isBracketFormat ? `@${displayName}` : full}
        </Text>
      );
    } else if (full.startsWith('#')) {
      const tag = match[4];
      parts.push(
        <Text
          key={`h-${start}`}
          style={[styles.tag, tagStyle]}
          onPress={() => router.push(`/social/search?q=${encodeURIComponent('#' + tag)}`)}
        >
          #{tag}
        </Text>
      );
    }
    idx = combined.lastIndex;
  }

  if (idx < content.length) {
    parts.push(
      <Text key={`t-end-${idx}`} style={style}>
        {content.substring(idx)}
      </Text>
    );
  }

  return <Text style={style} numberOfLines={numberOfLines}>{parts}</Text>;
}

const styles = StyleSheet.create({
  tag: {
    color: THEME_COLORS.primaryDark,
    fontWeight: 'bold',
  },
});
