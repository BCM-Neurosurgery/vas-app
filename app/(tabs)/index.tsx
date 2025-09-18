// SIMPLIFIED HOME SCREEN FOR 2-SCALE RATING SYSTEM
import QuickStart from '@/components/QuickStart';
import SimpleInterviewModal from '@/components/SimpleInterviewModal';
import { usePatient } from '@/contexts/PatientContext';
import { SimpleInterview } from '@/utils/database';
import { useState } from 'react';
import { View } from 'react-native';

export default function HomeScreen() {
  const { selectedPatient, refreshInterviews } = usePatient();
  const [isSimpleInterviewVisible, setIsSimpleInterviewVisible] = useState(false);

  const handleStartSimpleInterview = () => {
    setIsSimpleInterviewVisible(true);
  };

  const handleCloseSimpleInterview = () => {
    setIsSimpleInterviewVisible(false);
  };

  const handleInterviewSaved = (interview: SimpleInterview) => {
    console.log('Interview saved:', interview);
    // Refresh the interviews list
    refreshInterviews();
  };

  return (
    <View className="flex-1">
      <QuickStart 
        onStartInterview={handleStartSimpleInterview}
      />

      {/* Simple Interview Modal */}
      {selectedPatient && (
        <SimpleInterviewModal
          patientId={selectedPatient.id}
          isVisible={isSimpleInterviewVisible}
          onClose={handleCloseSimpleInterview}
          onSave={handleInterviewSaved}
        />
      )}
    </View>
  );
}