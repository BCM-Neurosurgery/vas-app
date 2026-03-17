import { subscribeSyncNotice } from '@/db/sync/syncNotice';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ConnectivityWarningProps {
  onRetry?: () => void;
}

interface ConnectivityStatus {
  backend: 'checking' | 'success' | 'warning';
  commentServer: 'checking' | 'success' | 'warning';
}

export default function ConnectivityWarning({ onRetry }: ConnectivityWarningProps) {
  const [status, setStatus] = useState<ConnectivityStatus>({
    backend: 'checking',
    commentServer: 'checking',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const checkBackend = async () => {
    try {
      const apiBase = process.env.EXPO_PUBLIC_DATABASE_URL;
      if (!apiBase) {
        throw new Error('Database URL not configured');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiBase}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      setStatus((prev) => ({ ...prev, backend: 'success' }));
    } catch (error) {
      console.error('Backend connection failed:', error);
      setStatus((prev) => ({ ...prev, backend: 'warning' }));
    }
  };

  const checkCommentServer = async () => {
    try {
      const commentServerUrl = process.env.EXPO_PUBLIC_COMMENT_SERVER_URL;
      if (!commentServerUrl) {
        throw new Error('Comment server URL not configured');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${commentServerUrl}/nsp_health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Comment server responded with status: ${response.status}`);
      }

      setStatus((prev) => ({ ...prev, commentServer: 'success' }));
    } catch (error) {
      console.error('Comment server connection failed:', error);
      setStatus((prev) => ({ ...prev, commentServer: 'warning' }));
    }
  };

  const runChecks = useCallback(async () => {
    try {
      setIsChecking(true);
      setStatus({
        backend: 'checking',
        commentServer: 'checking',
      });

      await Promise.all([checkBackend(), checkCommentServer()]);
      onRetry?.();
    } finally {
      setIsChecking(false);
    }
  }, [onRetry]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeSyncNotice((message) => {
      setSyncNotice(message);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setSyncNotice(null);
      }, 2500);
    });

    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const warnings: string[] = [];
  if (status.backend === 'warning') {
    warnings.push('Backend DB unavailable. Local data entry still works, but sync and server rehydration are unavailable.');
  }
  if (status.commentServer === 'warning') {
    warnings.push('Comment server unavailable. Some comment-related interview features may be limited.');
  }

  if (warnings.length === 0 && !syncNotice) {
    return null;
  }

  return (
    <View className="mx-4 mb-2 gap-2">
      {syncNotice && (
        <View className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-sm font-medium text-amber-800">
            {syncNotice}
          </Text>
        </View>
      )}

      {warnings.length > 0 && (
        <View className="rounded-lg border border-warning-200 bg-warning-50 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-medium text-warning-800">
                Connectivity Warning
              </Text>
              {warnings.map((warning) => (
                <Text key={warning} className="mt-1 text-xs text-warning-700">
                  {`⚠️ ${warning}`}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              onPress={runChecks}
              disabled={isChecking}
              className="ml-3 rounded-md bg-warning-200 px-3 py-1"
            >
              <Text className="text-xs font-medium text-warning-800">
                {isChecking ? 'Checking...' : 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
