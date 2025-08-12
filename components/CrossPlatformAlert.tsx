import { useState } from 'react';
import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface CrossPlatformAlertProps {
  title: string;
  message: string;
  buttons?: AlertButton[];
}

export function showCrossPlatformAlert({ title, message, buttons = [] }: CrossPlatformAlertProps) {
  if (Platform.OS === 'web') {
    // On web, use browser's native alert/confirm
    if (buttons.length === 0) {
      // Simple alert
      alert(`${title}\n\n${message}`);
    } else if (buttons.length === 1) {
      // Single button - just alert
      alert(`${title}\n\n${message}`);
      buttons[0]?.onPress?.();
    } else if (buttons.length === 2) {
      // Two buttons - use confirm
      const confirmed = confirm(`${title}\n\n${message}`);
      if (confirmed) {
        buttons[1]?.onPress?.();
      } else {
        buttons[0]?.onPress?.();
      }
    } else {
      // Multiple buttons - use confirm with first two
      const confirmed = confirm(`${title}\n\n${message}`);
      if (confirmed) {
        buttons[1]?.onPress?.();
      } else {
        buttons[0]?.onPress?.();
      }
    }
  } else {
    // On mobile, use React Native Alert
    Alert.alert(title, message, buttons);
  }
}

// Hook for custom alert state management on web
export function useWebAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<CrossPlatformAlertProps | null>(null);

  const showAlertWeb = (config: CrossPlatformAlertProps) => {
    if (Platform.OS === 'web') {
      setAlertConfig(config);
      setShowAlert(true);
    } else {
      showCrossPlatformAlert(config);
    }
  };

  return { showAlert, alertConfig, setShowAlert, showAlertWeb };
}
