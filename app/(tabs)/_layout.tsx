import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import SettingsDrawer from '@/components/SettingsDrawer';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Patient {
  id: string;
  name: string;
  isLatest?: boolean;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient>({
    id: '1',
    name: 'John Doe',
    isLatest: true,
  });

  const SettingsButton = () => (
    <TouchableOpacity
      onPress={() => setShowSettings(true)}
      style={{ marginRight: 15 }}
    >
      <IconSymbol name="gearshape.fill" size={24} color={Colors[colorScheme ?? 'light'].tint} />
    </TouchableOpacity>
  );
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
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
          headerRight: SettingsButton,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Quick Start',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="play.fill" color={color} />,
          }}
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
