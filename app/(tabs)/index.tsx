// SIMPLIFIED HOME SCREEN FOR 2-SCALE RATING SYSTEM
import { showCrossPlatformAlert } from '@/components/CrossPlatformAlert';
import QuickStart from '@/components/QuickStart';
import SimpleInterviewModal from '@/components/SimpleInterviewModal';
import { usePatient } from '@/contexts/PatientContext';
import { commentAPI } from '@/utils/comments';
import { SimpleInterview } from '@/utils/database';
import { useState } from 'react';
import { View } from 'react-native';


export default function HomeScreen() {
  const { selectedPatient, refreshInterviews } = usePatient();
  const [interviewStart, setInterviewStart] = useState<Date>(new Date());
  const [isSimpleInterviewVisible, setIsSimpleInterviewVisible] = useState(false);
  const [currentTaskName, setCurrentTaskName] = useState<string>('');

  const tryComment = async (type: 'start' | 'stop', taskName: string): Promise<boolean> => {
    const api = (type === 'start') ? commentAPI.startComment : commentAPI.stopComment;

    return new Promise((resolve) => {
      const attempt = async () => {
        const res = await api(taskName);

        const success = res.startsWith('success');

        if (success) {
          // Success: resolve and done
          resolve(true);
        } else {
          // Failure: show alert with Retry/Continue
          showCrossPlatformAlert({
            title: 'Comment alert',
            message: res,
            buttons: [
              {
                text: 'Retry',
                onPress: () => {
                  // try again
                  attempt();
                },
              },
              {
                text: 'Continue',
                onPress: () => {
                  // user chose to proceed anyway
                  resolve(false);
                },
              },
            ],
          });
        }
      }

      // kick off first attempt
      attempt();
    });
  };

  const handleStartSimpleInterview = async () => {
    // if comment server available, send start comment
    if (selectedPatient == null) {
      return;
    } else {
      const taskName = commentAPI.makeTaskName(selectedPatient.emu_id);
      setCurrentTaskName(taskName);
      // try to send start comment
      await tryComment('start', taskName);

      setInterviewStart(new Date());
      setIsSimpleInterviewVisible(true);
    }
  };

  const handleCloseSimpleInterview = async () => {
    await tryComment('stop', currentTaskName);
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
          startTime={interviewStart}
          onClose={handleCloseSimpleInterview}
          onSave={handleInterviewSaved}
        />
      )}
    </View>
  );
}