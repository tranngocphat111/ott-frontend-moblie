import { SocialContentCollectionScreen } from '@/components/social/SocialContentCollectionScreen';
import { MediaApi } from '@/services/api/media.api';
import React from 'react';

export default function SavedSocialScreen() {
  return (
    <SocialContentCollectionScreen
      title="Đã lưu"
      subtitle="Bài viết và story bạn muốn xem lại"
      emptyTitle="Chưa có nội dung đã lưu"
      emptySubtitle="Nhấn Lưu ở bài viết hoặc story để đưa nội dung vào đây."
      icon="bookmark"
      mode="saved"
      loadPage={MediaApi.fetchSavedContents}
    />
  );
}
