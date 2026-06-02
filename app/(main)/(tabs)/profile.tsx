import { SocialProfile } from '@/components/social';
import { useAuth } from '@/contexts/Authcontext';

export default function ProfileTab() {
  const { user } = useAuth();
  
  if (!user?.id) return null;
  
  return <SocialProfile userId={user.id} isTabScreen />;
}
