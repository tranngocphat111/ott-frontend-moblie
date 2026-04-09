export interface ChatParticipantSettings {
  category_id?: string | null;
  is_pinned: boolean;
  pinned_at?: string | null;
  notification_status: 'on' | 'mute' | 'off';
  mute_until?: string | null;
}

export interface ChatParticipant {
  _id: string;
  user_id: string;
  conversation_id: string;
  settings: ChatParticipantSettings;
  last_read_message_id: string;
  last_read_at: string;
  deleted_msg_id: string;
  unread_count?: number;
  nickname?: string;
  joined_at: string;
  roles: 'admin' | 'user';
}
