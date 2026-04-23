import { chatApiClient } from '../client';

export const chatRelationshipApi = {
  async fetchRelationshipStatus(userId1: string, userId2: string): Promise<any | null> {
    try {
      return await chatApiClient.get(`/relationships/status?userId1=${userId1}&userId2=${userId2}`);
    } catch (error) {
      return null;
    }
  },

  async sendFriendRequest(requesterId: string, receiverId: string): Promise<any | null> {
    try {
      return await chatApiClient.post('/relationships/send', { requesterId, receiverId });
    } catch (error) {
      return null;
    }
  },

  async acceptFriendRequest(relationshipId: string): Promise<boolean> {
    try {
      await chatApiClient.post(`/relationships/accept/${relationshipId}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  async rejectFriendRequest(relationshipId: string): Promise<boolean> {
    try {
      await chatApiClient.post(`/relationships/reject/${relationshipId}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  async unfriend(userId: string, friendId: string): Promise<boolean> {
    try {
      await chatApiClient.post('/relationships/unfriend', { userId, friendId });
      return true;
    } catch (error) {
      return false;
    }
  },
  
  async cancelFriendRequest(relationshipId: string): Promise<boolean> {
    try {
      await chatApiClient.post(`/relationships/cancel/${relationshipId}`);
      return true;
    } catch (error) {
      return false;
    }
  },
};
