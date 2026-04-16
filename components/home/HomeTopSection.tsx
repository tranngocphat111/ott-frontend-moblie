import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '@/constants/theme';

export type SearchTab = 'all' | 'contacts' | 'conversations' | 'messages' | 'files';

type HomeTopSectionProps = {
  onCreateConversation: () => void;
  onOpenQrScanner: () => void;
  onOpenFilter: () => void;
  onClearFilter: () => void;
  filterMode: 'all' | 'unread' | 'category';
  selectedCategoryCount: number;
  conversationCount: number;
  categoryColor?: string;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onClearSearch: () => void;
  onCloseSearch: () => void;
  isSearchMode: boolean;
  isSearchFocused: boolean;
};

export function HomeTopSection({
  onCreateConversation,
  onOpenQrScanner,
  onOpenFilter,
  onClearFilter,
  filterMode,
  selectedCategoryCount,
  conversationCount,
  categoryColor,
  searchText,
  onSearchTextChange,
  onSearchFocus,
  onSearchBlur,
  onClearSearch,
  onCloseSearch,
  isSearchMode,
  isSearchFocused,
}: HomeTopSectionProps) {
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isActiveSearch = isSearchMode || isSearchFocused || searchText.trim().length > 0;

  const menuItems = [
    { key: 'add-friend', icon: 'user-plus' as const, label: 'Thêm bạn' },
    { key: 'create-group', icon: 'users' as const, label: 'Tạo nhóm', onPress: onCreateConversation },
  ];

  const handleToggleMenu = () => {
    setIsMenuOpen((current) => !current);
  };

  const handleMenuItemPress = (action?: () => void) => {
    setIsMenuOpen(false);
    action?.();
  };

  const renderActionButtons = () => (
    <View className="flex-row items-center gap-2">
      <Pressable onPress={onOpenQrScanner} className="h-9 w-9 items-center justify-center">
        <Feather name="maximize" size={18} color={THEME_COLORS.neutral.white} />
      </Pressable>
      <Pressable onPress={handleToggleMenu} className="h-9 w-9 items-center justify-center">
        <Feather name="plus" size={22} color={THEME_COLORS.neutral.white} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ position: 'relative' }}>
      {isMenuOpen && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 20,
          }}
          onPress={() => setIsMenuOpen(false)}
        />
      )}

      <LinearGradient
        colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top + 10,
        }}
      >
        {!isActiveSearch ? (
          <View className="flex-row items-center gap-3">
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                height: 40,
                borderRadius: 14,
                paddingHorizontal: 14,
                backgroundColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <Feather name="search" size={18} color={THEME_COLORS.neutral.white} />
              <TextInput
                value={searchText}
                onChangeText={onSearchTextChange}
                placeholder="Tìm kiếm"
                placeholderTextColor={THEME_COLORS.neutral.white}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                style={{
                  marginLeft: 12,
                  flex: 1,
                  height: 40,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: THEME_COLORS.neutral.white,
                }}
              />
              {searchText.length > 0 && (
                <Pressable onPress={onClearSearch}>
                  <Feather name="x-circle" size={18} color={THEME_COLORS.neutral.white} />
                </Pressable>
              )}
            </View>
            {renderActionButtons()}
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Pressable onPress={onCloseSearch} className="h-9 w-9 items-center justify-center">
              <Feather name="chevron-left" size={22} color={THEME_COLORS.neutral.white} />
            </Pressable>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                height: 40,
                borderRadius: 14,
                paddingHorizontal: 14,
                backgroundColor: 'white',
              }}
            >
              <Feather name="search" size={18} color={THEME_COLORS.primary[900]} />
              <TextInput
                value={searchText}
                onChangeText={onSearchTextChange}
                placeholder="Tìm kiếm"
                placeholderTextColor={THEME_COLORS.primary[900]}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                style={{
                  marginLeft: 12,
                  flex: 1,
                  height: 40,
                  paddingVertical: 0,
                  fontSize: 14,
                  color: THEME_COLORS.primary[900],
                }}
              />
              {searchText.length > 0 && (
                <Pressable onPress={onClearSearch}>
                  <Feather name="x-circle" size={18} color={THEME_COLORS.primary[900]} />
                </Pressable>
              )}
            </View>
            {renderActionButtons()}
          </View>
        )}
      </LinearGradient>

      {!isActiveSearch && <View className="border-b border-slate-200 bg-white" />}

      {!isActiveSearch && (
        <View className="border-b border-slate-200 bg-white px-4 py-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-medium text-slate-500">{conversationCount} cuộc trò chuyện</Text>
            {filterMode === 'all' ? (
              <Pressable
                onPress={onOpenFilter}
                className="h-9 w-9 items-center justify-center rounded-sm"
                style={{ backgroundColor: '#EEF1F5' }}
              >
                <Feather name="filter" size={16} color={THEME_COLORS.neutral.slate600} />
              </Pressable>
            ) : filterMode === 'unread' ? (
              <Pressable
                onPress={onOpenFilter}
                className="flex-row items-center rounded-full border border-slate-300 bg-white px-3 py-1.5"
              >
                <Text className="text-[15px] font-medium text-slate-700">Chưa đọc</Text>
                <Pressable onPress={onClearFilter} className="ml-2 h-5 w-5 items-center justify-center rounded-full">
                  <Feather name="x" size={13} color={THEME_COLORS.neutral.slate500} />
                </Pressable>
              </Pressable>
            ) : (
              <Pressable
                onPress={onOpenFilter}
                className="flex-row items-center rounded-full border border-slate-300 bg-white px-3 py-1.5"
              >
                <Feather name="tag" size={14} color={categoryColor || '#F97316'} style={{ marginRight: 8 }} />
                <Text className="text-[15px] font-medium text-slate-700">{selectedCategoryCount} thẻ</Text>
                <Pressable onPress={onClearFilter} className="ml-2 h-5 w-5 items-center justify-center rounded-full">
                  <Feather name="x" size={13} color={THEME_COLORS.neutral.slate500} />
                </Pressable>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {isMenuOpen && (
        <View
          style={{
            position: 'absolute',
            right: 16,
            top: insets.top + (isActiveSearch ? 44 : 54),
            width: 180,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.95)',
            paddingVertical: 8,
            zIndex: 30,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 1,
            shadowRadius: 12,
          }}
        >
          {menuItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => handleMenuItemPress(item.onPress)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Feather name={item.icon} size={18} color="black" />
              <Text style={{ marginLeft: 12, fontSize: 16, color: 'black' }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
