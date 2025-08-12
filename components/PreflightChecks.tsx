import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { showCrossPlatformAlert } from './CrossPlatformAlert';

interface PreflightStatus {
  eliasLogin: 'loading' | 'success' | 'error';
  catmhServer: 'loading' | 'success' | 'error';
  commentServer: 'loading' | 'success' | 'error' | 'warning';
}

interface PreflightChecksProps {
  onComplete?: () => void;
}

export default function PreflightChecks({ onComplete }: PreflightChecksProps) {
  const [status, setStatus] = useState<PreflightStatus>({
    eliasLogin: 'loading',
    catmhServer: 'loading',
    commentServer: 'loading',
  });
  const [showWarning, setShowWarning] = useState(false);

  // Simulate API calls - replace with actual API calls
  const checkEliasLogin = async () => {
    try {
      // Replace with actual Elias login API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus(prev => ({ ...prev, eliasLogin: 'success' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, eliasLogin: 'error' }));
      showCrossPlatformAlert({
        title: 'Login Failed',
        message: 'Unable to authenticate with Elias. Please check your credentials.'
      });
    }
  };

  const checkCatmhServer = async () => {
    try {
      // Replace with actual CAT-MH server ping
      await new Promise(resolve => setTimeout(resolve, 800));
      setStatus(prev => ({ ...prev, catmhServer: 'success' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, catmhServer: 'error' }));
      showCrossPlatformAlert({
        title: 'Server Error',
        message: 'Unable to connect to CAT-MH server. Please check your connection.'
      });
    }
  };

  const checkCommentServer = async () => {
    try {
      // Replace with actual comment server ping
      await new Promise(resolve => setTimeout(resolve, 600));
      setStatus(prev => ({ ...prev, commentServer: 'success' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, commentServer: 'warning' }));
      setShowWarning(true);
    }
  };

  useEffect(() => {
    const runChecks = async () => {
      await Promise.all([
        checkEliasLogin(),
        checkCatmhServer(),
        checkCommentServer(),
      ]);
    };

    runChecks();
  }, []);

  useEffect(() => {
    // Navigate to main app when all critical checks pass
    if (status.eliasLogin === 'success' && status.catmhServer === 'success') {
      // Auto-set config to latest patient
      // This would typically fetch from your database
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }
  }, [status.eliasLogin, status.catmhServer, onComplete]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return '#007AFF';
      case 'success': return '#34C759';
      case 'error': return '#FF3B30';
      case 'warning': return '#FF9500';
      default: return '#007AFF';
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-5 bg-medical-gray">
      <Text className="text-2xl font-bold mb-10 text-medical-text-primary">
        System Check
      </Text>
      
      <View className="w-full">
        <View className="flex-row justify-between items-center w-full py-4 px-5 bg-white rounded-xl mb-3 shadow-sm">
          <Text className="text-base text-medical-text-primary">Elias Login</Text>
          <Text className="text-xl" style={{ color: getStatusColor(status.eliasLogin) }}>
            {getStatusIcon(status.eliasLogin)}
          </Text>
        </View>

        <View className="flex-row justify-between items-center w-full py-4 px-5 bg-white rounded-xl mb-3 shadow-sm">
          <Text className="text-base text-medical-text-primary">CAT-MH Server</Text>
          <Text className="text-xl" style={{ color: getStatusColor(status.catmhServer) }}>
            {getStatusIcon(status.catmhServer)}
          </Text>
        </View>

        <View className="flex-row justify-between items-center w-full py-4 px-5 bg-white rounded-xl mb-3 shadow-sm">
          <Text className="text-base text-medical-text-primary">Comment Server</Text>
          <Text className="text-xl" style={{ color: getStatusColor(status.commentServer) }}>
            {getStatusIcon(status.commentServer)}
          </Text>
        </View>
      </View>

      {showWarning && status.commentServer === 'warning' && (
        <View className="bg-warning-50 border border-warning-200 rounded-lg p-4 mt-5 w-full">
          <Text className="text-warning-700 text-center">
            ⚠️ Comment server is unavailable. Some features may be limited.
          </Text>
        </View>
      )}

      {(status.eliasLogin === 'error' || status.catmhServer === 'error') && (
        <View className="bg-error-50 border border-error-200 rounded-lg p-4 mt-5 w-full">
          <Text className="text-error-700 text-center">
            Critical system error. Please check your connection and try again.
          </Text>
        </View>
      )}
    </View>
  );
}
