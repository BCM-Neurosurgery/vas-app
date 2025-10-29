// SIMPLIFIED QUICK START FOR 2-SCALE RATING SYSTEM
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePatient } from '@/contexts/PatientContext';
import { ScrollView, TouchableOpacity, View } from 'react-native';
  
interface QuickStartProps {
  onStartInterview: () => void;
}

export default function QuickStart({ onStartInterview }: QuickStartProps) {
  const { selectedPatient } = usePatient();

  return (
    <ThemedView className="flex-1 p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <ThemedText className="text-2xl font-bold text-center mb-2">
            Daily Check-in
          </ThemedText>
          <ThemedText className="text-base text-center text-gray-600 dark:text-gray-400">
            Track your mood and energy with a simple 2-scale rating
          </ThemedText>
        </View>

        {/* Current Patient Info */}
        {selectedPatient ? (
          <View className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <ThemedText className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
              Current Patient
            </ThemedText>
            <ThemedText className="text-base text-blue-700 dark:text-blue-300">
              {selectedPatient.emu_id}
            </ThemedText>
          </View>
        ) : (
          <View className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <ThemedText className="text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
              No Patient Selected
            </ThemedText>
            <ThemedText className="text-sm text-yellow-700 dark:text-yellow-300">
              Please go to Settings to select a patient before starting a check-in.
            </ThemedText>
          </View>
        )}

        {/* Main Action Button */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={onStartInterview}
            disabled={!selectedPatient}
            className={`flex-row items-center justify-center p-6 rounded-xl ${
              !selectedPatient
                ? 'bg-gray-300 dark:bg-gray-700'
                : 'bg-blue-300 dark:bg-blue-700'
            }`}
          >
            <IconSymbol name="heart.fill" size={24} color="white" />
            <ThemedText className="text-white font-bold text-xl ml-3">
              Start Daily Check-in
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* What to Expect */}
        <View className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
          <ThemedText className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
            What to Expect
          </ThemedText>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <IconSymbol name="1.circle.fill" size={20} color="#10B981" />
              <ThemedText className="text-sm text-green-700 dark:text-green-300 ml-2">
                Rate your current mood (1-7 scale)
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <IconSymbol name="2.circle.fill" size={20} color="#10B981" />
              <ThemedText className="text-sm text-green-700 dark:text-green-300 ml-2">
                Rate your energy level (1-7 scale)
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <IconSymbol name="3.circle.fill" size={20} color="#10B981" />
              <ThemedText className="text-sm text-green-700 dark:text-green-300 ml-2">
                Save and track over time
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-4">
          <ThemedText className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-200">
            Benefits
          </ThemedText>
          <View className="space-y-2">
            <ThemedText className="text-sm text-purple-700 dark:text-purple-300">
              📈 Track patterns in your mood and energy
            </ThemedText>
            <ThemedText className="text-sm text-purple-700 dark:text-purple-300">
              🎯 Simple and quick - takes less than 30 seconds
            </ThemedText>
            <ThemedText className="text-sm text-purple-700 dark:text-purple-300">
              💡 Identify trends and triggers over time
            </ThemedText>
          </View>
        </View>

        {/* Instructions */}
        <View className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <ThemedText className="text-lg font-semibold mb-2">How it works</ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            1. Select a patient in Settings
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            2. Click &apos;Start Daily Check-in&apos; to begin
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            3. Use sliders to rate your mood and energy (1-7)
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
            4. Save your ratings and view history
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}