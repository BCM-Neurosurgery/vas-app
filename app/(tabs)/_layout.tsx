import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import { HapticTab } from '@/components/HapticTab';
import SettingsDrawer from '@/components/SettingsDrawer';
import SettingsPasswordModal from '@/components/SettingsPasswordModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { usePatient } from '@/contexts/PatientContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { registerForPushNotificationsAsync } from '@/notifications/registerPush';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity } from 'react-native';

// NOTE: not a real secret, but fine for a “patient lock”
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_SETTINGS_PASSWORD;

// Move SettingsButton outside to avoid re-creation issues
const SettingsButton = ({ onPress, color }: { onPress: () => void; color: string }) => (
  <TouchableOpacity
    onPress={onPress}
    className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors settings-button"
    style={{ 
      marginRight: 15,
      padding: Platform.OS === 'web' ? 8 : 4,
      borderRadius: Platform.OS === 'web' ? 8 : 0,
      // Debug styling to ensure visibility
      backgroundColor: Platform.OS === 'web' ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
    }}
    data-testid="settings-button"
  >
    <IconSymbol name="gearshape.fill" size={24} color={color} />
    {/* Debug text for web */}
    {Platform.OS === 'web' && (
      <Text style={{ fontSize: 10, color: '#007AFF', marginTop: 2 }}>Settings</Text>
    )}
  </TouchableOpacity>
);

export default function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const [showSettings, setShowSettings] = useState(false);
  const [pushToken, setPushToken] = useState('');
  const { selectedPatient, setSelectedPatient } = usePatient();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const tintColor = Colors[colorScheme ?? 'light'].tint;

  // make sure token is registered, or notify if not
  useEffect(() => {
    registerForPushNotificationsAsync(process.env.EXPO_PUBLIC_DATABASE_URL)
    .then(res => {
      setPushToken(res.expo_push_token);
      console.log('successfully registered push token');
    })
    .catch(err => {
      showCrossPlatformAlert({
        title: 'push token error notification', 
        message: `issue registering push token: ${err}`
      })
    })
  }, []);

  const handleSettingsPress = () => {
    // if no password configured, just open settings directly
    if (!ADMIN_PASSWORD) {
      setShowSettings(true);
      return;
    }

    // Password required every time
    setShowPasswordModal(true);
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    setShowSettings(true);
  }

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: tintColor,
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
          headerRight: () => <SettingsButton onPress={handleSettingsPress} color={tintColor} />,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Quick Start',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="play.fill" color={color} />,
          }}
          initialParams={{ selectedPatient, setSelectedPatient }}
        />
        <Tabs.Screen
          name="interviews"
          options={{
            title: 'Past Interviews',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
          }}
        />
      </Tabs>

      <SettingsDrawer
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        selectedPatient={selectedPatient}
        onPatientChange={setSelectedPatient}
        pushToken={pushToken}
      />

      <SettingsPasswordModal
        visible={showPasswordModal}
        onCancel={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
        adminPassword={ADMIN_PASSWORD}
      />
    </>
  );
}
