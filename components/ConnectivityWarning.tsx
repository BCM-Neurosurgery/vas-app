import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ConnectivityWarningProps {
  onRetry?: () => void;
}

export default function ConnectivityWarning({ onRetry }: ConnectivityWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check comment server connectivity
  const checkCommentServer = async () => {
    try {
      setIsChecking(true);
      
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
        setShowWarning(false);
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Comment server connection failed:', error);
      setShowWarning(true);
    } finally {
      setIsChecking(false);
    }
  };

  // Check on component mount
  useEffect(() => {
    checkCommentServer();
  }, []);

  // Don't render if no warning
  if (!showWarning) {
    return null;
  }

  return (
    <View className="bg-warning-50 border-l-4 border-warning-400 p-4 mx-4 mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-warning-800 font-medium text-sm">
            ⚠️ Comment server unavailable
          </Text>
          <Text className="text-warning-700 text-xs mt-1">
            Some features may be limited. Check your connection.
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={checkCommentServer}
          disabled={isChecking}
          className="ml-3 px-3 py-1 bg-warning-200 rounded-md"
        >
          <Text className="text-warning-800 text-xs font-medium">
            {isChecking ? 'Checking...' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
