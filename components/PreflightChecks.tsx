import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

interface PreflightStatus {
  database: 'loading' | 'success' | 'warning';
  commentServer: 'loading' | 'success' | 'warning';
}

interface PreflightChecksProps {
  onComplete?: () => void;
}

export default function PreflightChecks({ onComplete }: PreflightChecksProps) {
  const [status, setStatus] = useState<PreflightStatus>({
    database: 'loading',
    commentServer: 'loading',
  });

  // Check database connectivity
  const checkDatabase = async () => {
    try {
      // Check if API_BASE_URL is configured
      const API_BASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;
      if (!API_BASE_URL) {
        throw new Error('Database URL not configured');
      }
      
      // Try to ping the database endpoint directly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus(prev => ({ ...prev, database: 'success' }));
      } else {
        throw new Error(`Database responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      setStatus(prev => ({ ...prev, database: 'warning' }));
    }
  };

  // Check comment server connectivity (CAT-MH server)
  const checkCommentServer = async () => {
    try {
      // Try to ping the comment server with health request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const COMMENT_SERVER_URL = process.env.EXPO_PUBLIC_COMMENT_SERVER_URL;

      if (!COMMENT_SERVER_URL) {
        throw new Error('Comment server URL not configured');
      }

      const response = await fetch(`${COMMENT_SERVER_URL}/nsp_health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus(prev => ({ ...prev, commentServer: 'success' }));
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Comment server connection failed:', error);
      setStatus(prev => ({ ...prev, commentServer: 'warning' }));
    }
  };

  useEffect(() => {
    const runChecks = async () => {
      await Promise.all([
        checkDatabase(),
        checkCommentServer(),
      ]);
    };

    runChecks();
  }, []);

  useEffect(() => {
    const checksFinished =
      status.database !== 'loading' &&
      status.commentServer !== 'loading';

    if (checksFinished) {
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }
  }, [status.database, status.commentServer, onComplete]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return '⏳';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return '#007AFF';
      case 'success': return '#34C759';
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
          <Text className="text-base text-medical-text-primary">Database Connection</Text>
          <Text className="text-xl" style={{ color: getStatusColor(status.database) }}>
            {getStatusIcon(status.database)}
          </Text>
        </View>

        <View className="flex-row justify-between items-center w-full py-4 px-5 bg-white rounded-xl mb-3 shadow-sm">
          <Text className="text-base text-medical-text-primary">Comment Server</Text>
          <Text className="text-xl" style={{ color: getStatusColor(status.commentServer) }}>
            {getStatusIcon(status.commentServer)}
          </Text>
        </View>
      </View>

      {(status.database === 'loading' || status.commentServer === 'loading') && (
        <View className="mt-6">
          <Text className="text-medical-text-secondary text-center">
            Checking system connectivity...
          </Text>
        </View>
      )}
    </View>
  );
}
