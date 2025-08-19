import InterviewDrawer from '@/components/InterviewDrawer';
import QuickStart from '@/components/QuickStart';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { InterviewOrchestrator } from '@/utils/interviewOrchestrator';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
 
  // Parse the patient data from the route params
  const [interviewOrchestrator, setInterviewOrchestrator] = useState<InterviewOrchestrator | null>(null);
  const [isInterviewDrawerVisible, setIsInterviewDrawerVisible] = useState(false);
  const [isInterviewMinimized, setIsInterviewMinimized] = useState(false);

  const handleStartInterview = (orchestrator: InterviewOrchestrator) => {
    setInterviewOrchestrator(orchestrator);
    setIsInterviewDrawerVisible(true);
    setIsInterviewMinimized(false);
  };

  const handleShowMinimizedInterview = (orchestrator: InterviewOrchestrator) => {
    setInterviewOrchestrator(orchestrator);
    setIsInterviewDrawerVisible(true);
    setIsInterviewMinimized(false);
  };

  const handleCloseInterview = () => {
    setIsInterviewDrawerVisible(false);
    setInterviewOrchestrator(null);
  };

  const handleMinimizeInterview = () => {
    setIsInterviewDrawerVisible(false);
    setIsInterviewMinimized(true);
  };

  const handleRestoreMinimizedInterview = () => {
    if (interviewOrchestrator) {
      interviewOrchestrator.restoreInterview();
      setIsInterviewDrawerVisible(true);
      setIsInterviewMinimized(false);
    }
  };

  return (
    <View className="flex-1">
      <QuickStart 
        onStartInterview={handleStartInterview}
        onShowMinimizedInterview={handleShowMinimizedInterview}
      />

      {/* Interview Drawer */}
      {interviewOrchestrator && (
        <InterviewDrawer
          orchestrator={interviewOrchestrator}
          isVisible={isInterviewDrawerVisible}
          onClose={handleCloseInterview}
          onMinimize={handleMinimizeInterview}
        />
      )}

      {/* Minimized Interview Indicator */}
      {isInterviewMinimized && interviewOrchestrator && (
        <TouchableOpacity
          onPress={handleRestoreMinimizedInterview}
          className="absolute top-16 right-4 bg-blue-500 p-3 rounded-full shadow-lg"
        >
          <IconSymbol name="doc.text" size={20} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}