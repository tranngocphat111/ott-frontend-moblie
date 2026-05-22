import { SocialContentCollectionScreen } from '@/components/social/SocialContentCollectionScreen';
import { MediaApi } from '@/services/api/media.api';
import React from 'react';

export default function SocialHistoryScreen() {
  return (
    <SocialContentCollectionScreen
      title="Lịch sử xem"
      subtitle="Các bài viết và story bạn đã mở gần đây"
      emptyTitle="Chưa có lịch sử xem"
      emptySubtitle="Khi bạn xem feed hoặc mở story, nội dung sẽ xuất hiện ở đây."
      icon="clock"
      mode="history"
      loadPage={MediaApi.fetchViewHistory}
      onClearAll={MediaApi.clearViewHistory}
    />
  );
}
