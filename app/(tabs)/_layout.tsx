import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { usePatient } from '@/contexts/PatientContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, TouchableOpacity } from 'react-native';
import SettingsDrawer from '../../components/SettingsDrawer';

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
  const { selectedPatient, setSelectedPatient } = usePatient();

  const tintColor = Colors[colorScheme ?? 'light'].tint;

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
          headerRight: () => <SettingsButton onPress={() => setShowSettings(true)} color={tintColor} />,
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
      />
    </>
  );
}
