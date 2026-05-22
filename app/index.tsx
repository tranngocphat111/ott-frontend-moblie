import { useAuth } from '@/contexts/Authcontext';
import LoadingScreen from '@/components/common/LoadingScreen';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Đang kiểm tra phiên đăng nhập" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/landing" />;
}
