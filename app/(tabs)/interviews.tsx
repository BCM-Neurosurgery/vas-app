import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import SimpleInterviewList from '@/components/SimpleInterviewList';
import { usePatient } from '@/contexts/PatientContext';
import { SimpleInterview } from '@/utils/database';
import { getEnergyEmoji, getRatingEmoji } from '@/utils/simpleInterview';
import { Text, View } from 'react-native';

export default function InterviewsScreen() {
  const { selectedPatient } = usePatient();

  const handleInterviewSelect = (interview: SimpleInterview) => {
    showCrossPlatformAlert({
      title: 'Daily Check-in Details',
      message: `Mood: ${interview.mood_rating}/7 ${getRatingEmoji(interview.mood_rating)}\nEnergy: ${interview.energy_rating}/7 ${getEnergyEmoji(interview.energy_rating)}\n\nDate: ${interview.timestamp.toLocaleDateString()}\nTime: ${interview.timestamp.toLocaleTimeString()}`
    });
  };

  if (!selectedPatient) {
    return (
      <View className="flex-1 justify-center items-center py-15">
        <Text className="text-lg font-semibold text-medical-text-secondary mt-4 mb-2">
          No Patient Selected
        </Text>
        <Text className="text-sm text-medical-text-muted text-center px-10">
          Please select a patient from the Quick Start tab to view their daily check-ins.
        </Text>
      </View>
    );
  }

  return (
    <SimpleInterviewList
      patient={selectedPatient}
      onInterviewSelect={handleInterviewSelect}
    />
  );
}
