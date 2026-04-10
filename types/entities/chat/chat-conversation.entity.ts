export interface ChatConversationParticipant {
  _id: string;
  user_id?: string;
  display_name: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  role?: 'admin' | 'member' | 'owner';
  joined_at?: string;
}

export interface ChatConversation {
  _id: string;
  type: 'private' | 'group';
  name: string;
  avatar: string;
  created_by: string;
  member_count: number;
  last_message?: {
    msg_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    type: 'text' | 'link' | 'image' | 'video' | 'file' | 'audio';
    createdAt: string;
  };
  is_deleted: boolean;
  is_self_conversation?: boolean;
  self_owner_id?: string | null;
  background: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  participants?: ChatConversationParticipant[];
}
