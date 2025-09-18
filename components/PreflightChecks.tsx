import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface PreflightStatus {
  database: 'loading' | 'success' | 'error';
  commentServer: 'loading' | 'success' | 'error' | 'warning';
}

interface PreflightChecksProps {
  onComplete?: () => void;
}

export default function PreflightChecks({ onComplete }: PreflightChecksProps) {
  const [status, setStatus] = useState<PreflightStatus>({
    database: 'loading',
    commentServer: 'loading',
  });
  const [showWarning, setShowWarning] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
      
      const response = await fetch(`${API_BASE_URL}/patients`, {
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
      setStatus(prev => ({ ...prev, database: 'error' }));
    }
  };

  // Check comment server connectivity (CAT-MH server)
  const checkCommentServer = async () => {
    try {
      // Try to ping the comment server with health request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const COMMENT_SERVER_URL = process.env.EXPO_PUBLIC_COMMENT_SERVER_URL;

      const response = await fetch(`${COMMENT_SERVER_URL}/health`, {
        method: 'HEAD',
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
      setShowWarning(true);
    }
  };

  // Retry all checks
  const retryChecks = async () => {
    setRetryCount(prev => prev + 1);
    setStatus({
      database: 'loading',
      commentServer: 'loading',
    });
    setShowWarning(false);
    
    await Promise.all([
      checkDatabase(),
      checkCommentServer(),
    ]);
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
    // Navigate to main app when database check passes
    if (status.database === 'success') {
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }
  }, [status.database, onComplete]);

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

  // If database is not available, show error screen
  if (status.database === 'error') {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-red-50">
        <Text className="text-3xl mb-6 text-red-600">⚠️</Text>
        <Text className="text-2xl font-bold mb-4 text-red-800 text-center">
          Database Connection Failed
        </Text>
        <Text className="text-base text-red-700 text-center mb-6 leading-6">
          The app cannot function without access to the database. Please check your connection and try again.
        </Text>
        
        <TouchableOpacity
          onPress={retryChecks}
          className="bg-red-600 px-6 py-3 rounded-lg mb-4"
        >
          <Text className="text-white font-semibold text-lg">Retry Connection</Text>
        </TouchableOpacity>
        
        <Text className="text-sm text-red-600 text-center">
          Retry attempt: {retryCount + 1}
        </Text>
      </View>
    );
  }

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

      {showWarning && status.commentServer === 'warning' && (
        <View className="bg-warning-50 border border-warning-200 rounded-lg p-4 mt-5 w-full">
          <Text className="text-warning-700 text-center font-medium">
            ⚠️ Comment server is unavailable. Some features may be limited.
          </Text>
        </View>
      )}

      {status.database === 'loading' && (
        <View className="mt-6">
          <Text className="text-medical-text-secondary text-center">
            Checking system connectivity...
          </Text>
        </View>
      )}
    </View>
  );
}
