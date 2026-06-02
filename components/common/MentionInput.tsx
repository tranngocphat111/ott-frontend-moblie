import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MentionInput as ControlledMentionInput } from 'react-native-controlled-mentions';
import { userApi } from '@/services/api/user.api';
import { Avatar } from '@/components/social/SocialAvatar';
import { SOCIAL_COLORS } from '../social/socialTheme';

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: object;
  [key: string]: any;
}

export const SuggestionsDropdown = ({ keyword, onSuggestionPress }: { keyword: string | undefined, onSuggestionPress: (suggestion: { id: string, name: string }) => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = await userApi.searchUsers(query);
      const data = Array.isArray(results) ? results : (results as any)?.data || (results as any)?.result || [];
      setUsers(data.slice(0, 10)); // Limit to 10
    } catch (error) {
      console.error('Error fetching users for mention:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (keyword != null) {
      const timer = setTimeout(() => {
        fetchUsers(keyword);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setUsers([]);
    }
  }, [keyword, fetchUsers]);

  if (keyword == null) {
    return null;
  }

  if (users.length === 0 && !isLoading) return null;

  return (
    <View style={styles.dropdown}>
      {isLoading && users.length === 0 ? (
        <ActivityIndicator size="small" color="#8b5cf6" style={{ margin: 10 }} />
      ) : users.length > 0 ? (
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {users.map((user) => {
            const id = user.id || user._id || user.userId || user.user_id;
            const name = user.fullName || user.displayName || user.name || user.username || 'User';
            const avatar = user.avatarUrl || user.avatar;
            
            return (
              <TouchableOpacity
                key={id}
                style={styles.userItem}
                onPress={() => onSuggestionPress({ id, name })}
              >
                <Avatar uri={avatar} name={name} size={32} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
};

const SuggestionProxy = ({ keyword, onSuggestionPress, onPropsChange }: any) => {
  React.useEffect(() => {
    onPropsChange(keyword, onSuggestionPress);
    return () => {
      onPropsChange(undefined, undefined);
    };
  }, [keyword, onSuggestionPress, onPropsChange]);
  return null;
};

export interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: object;
  onMentionStateChange?: (keyword: string | undefined, onPress: any) => void;
  [key: string]: any;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChangeText,
  containerStyle,
  onMentionStateChange,
  ...props
}) => {

  const handleTriggersChange = React.useCallback(
    (triggers: any) => {
      const atTrigger = triggers['@'];
      if (atTrigger && atTrigger.keyword != null) {
        onMentionStateChange?.(atTrigger.keyword, atTrigger.onSelect);
      } else {
        onMentionStateChange?.(undefined, undefined);
      }
    },
    [onMentionStateChange]
  );

  const triggersConfig = React.useMemo(() => ({
    '@': {
      trigger: '@',
      textStyle: { fontWeight: 'bold', color: SOCIAL_COLORS.primaryDark },
      isInsertSpaceAfterMention: true,
    }
  }), []);

  return (
    <View style={[{ position: 'relative', flexShrink: 1, width: '100%', zIndex: 9999, overflow: 'visible' }, containerStyle]}>
      <ControlledMentionInput
        value={value}
        onChange={onChangeText}
        triggersConfig={triggersConfig}
        onTriggersChange={handleTriggersChange}
        containerStyle={{ flex: 1 }}
        style={[styles.input, props.style]}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  scrollView: {
    maxHeight: 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});

export default MentionInput;
