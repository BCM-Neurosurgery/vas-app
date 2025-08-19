import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import InterviewList from '@/components/InterviewList';
import { usePatient } from '@/contexts/PatientContext';
import { Interview } from '@/utils/database';
import { Text, View } from 'react-native';

export default function InterviewsScreen() {
  const { selectedPatient } = usePatient();

  const handleInterviewSelect = (interview: Interview) => {
    // In a real app, this would navigate to the interview results
    showCrossPlatformAlert({
      title: 'Interview Results',
      message: `Viewing results for ${interview.survey_type} on ${interview.start_time.toLocaleDateString()}\n\nThis would show detailed assessment results and recommendations.`
    });
    
    // Example navigation to results (uncomment when you have results screens)
    // router.push(`/results/${interview.id}`);
  };

  if (!selectedPatient) {
    return (
      <View className="flex-1 justify-center items-center py-15">
        <Text className="text-lg font-semibold text-medical-text-secondary mt-4 mb-2">
          No Patient Selected
        </Text>
        <Text className="text-sm text-medical-text-muted text-center px-10">
          Please select a patient from the Quick Start tab to view their interviews.
        </Text>
      </View>
    );
  }

  return (
    <InterviewList
      patient={selectedPatient}
      onInterviewSelect={handleInterviewSelect}
    />
  );
}
