import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePatient } from '@/contexts/PatientContext';
import { resetMockData } from '@/utils/catmh';
import { InterviewOrchestrator, InterviewState } from '@/utils/interviewOrchestrator';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
  
interface QuickStartProps {
  onStartInterview: (orchestrator: InterviewOrchestrator) => void;
  onShowMinimizedInterview: (orchestrator: InterviewOrchestrator) => void;
}

export default function QuickStart({ onStartInterview, onShowMinimizedInterview }: QuickStartProps) {
  const { selectedPatient } = usePatient();
  const [orchestrator, setOrchestrator] = useState<InterviewOrchestrator | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize orchestrator
  useEffect(() => {
    const newOrchestrator = new InterviewOrchestrator({
      onInterviewInitialized: (initResponse) => {
        console.log('Interview initialized:', initResponse);
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onQuestionReceived: (question) => {
        console.log('New question received:', question.questionDescription);
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onAnswerSubmitted: (answer) => {
        console.log('Answer submitted:', answer);
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onProgressUpdate: (progress) => {
        console.log('Interview progress:', progress);
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onInterviewComplete: (results) => {
        console.log('Interview completed:', results);
        setInterviewState(orchestrator?.getInterviewState() || null);
        Alert.alert('Interview Complete', 'The interview has been completed successfully!');
      },
      onInterviewPaused: () => {
        console.log('Interview paused');
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onInterviewResumed: () => {
        console.log('Interview resumed');
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onInterviewMinimized: () => {
        console.log('Interview minimized');
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onInterviewRestored: () => {
        console.log('Interview restored');
        setInterviewState(orchestrator?.getInterviewState() || null);
      },
      onError: (error) => {
        console.error('Interview error:', error);
        Alert.alert('Error', error.message);
      },
    });

    setOrchestrator(newOrchestrator);
  }, []);

  // Check for existing interviews
  useEffect(() => {
    if (orchestrator) {
      checkExistingInterview();
    }
  }, [orchestrator, selectedPatient]);

  const checkExistingInterview = async () => {
    if (!orchestrator || !selectedPatient) return;

    try {
      const existingInterview = await orchestrator.checkExistingInterview(1, selectedPatient.emu_id);
      if (existingInterview) {
        // There's an existing interview - check if it's active
        const state = orchestrator.getInterviewState();
        if (state.isActive || state.isPaused || state.isMinimized) {
          setInterviewState(state);
        }
      }
    } catch (error) {
      console.error('Error checking existing interview:', error);
    }
  };

  const handleStartNewInterview = async () => {
    if (!orchestrator || !selectedPatient) {
      Alert.alert('Error', 'Please select a patient first in Settings');
      return;
    }

    setIsLoading(true);
    try {
      // Start a new interview with MDD and Depression tests
      await orchestrator.startInterview(1, selectedPatient.emu_id, ['mdd', 'dep'], 1, 4);
      
      // Get the first question
      await orchestrator.getCurrentQuestion();
      
      // Open the interview drawer
      onStartInterview(orchestrator);
    } catch (error) {
      console.error('Error starting interview:', error);
      Alert.alert('Error', 'Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeInterview = () => {
    if (!orchestrator) return;

    if (interviewState?.isMinimized) {
      // Restore minimized interview
      orchestrator.restoreInterview();
      onShowMinimizedInterview(orchestrator);
    } else if (interviewState?.isPaused) {
      // Resume paused interview
      orchestrator.resumeInterview();
      onStartInterview(orchestrator);
    } else {
      // Show active interview
      onStartInterview(orchestrator);
    }
  };

  const handleResetMockData = () => {
    resetMockData();
    setInterviewState(null);
    Alert.alert('Reset Complete', 'Mock interview data has been reset. You can now start a new interview.');
  };

  const getInterviewStatusText = () => {
    if (!interviewState) return 'No active interview';
    
    if (interviewState.progress?.isComplete) return 'Interview completed';
    if (interviewState.isPaused) return 'Interview paused';
    if (interviewState.isMinimized) return 'Interview minimized';
    if (interviewState.isActive) return 'Interview in progress';
    
    return 'Interview status unknown';
  };

  const getInterviewStatusColor = () => {
    if (!interviewState) return '#6B7280';
    
    if (interviewState.progress?.isComplete) return '#10B981';
    if (interviewState.isPaused) return '#F59E0B';
    if (interviewState.isMinimized) return '#3B82F6';
    if (interviewState.isActive) return '#EF4444';
    
    return '#6B7280';
  };

  return (
    <ThemedView className="flex-1 p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <ThemedText className="text-2xl font-bold text-center mb-2">
            Quick Start
          </ThemedText>
          <ThemedText className="text-base text-center text-gray-600 dark:text-gray-400">
            Start a new mental health assessment or continue an existing one
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
              Please go to Settings to select a patient before starting an interview.
            </ThemedText>
          </View>
        )}

        {/* Interview Status */}
        {interviewState && (
          <View className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <ThemedText className="text-lg font-semibold mb-2">Current Interview Status</ThemedText>
            <View className="flex-row items-center mb-2">
            <View 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: getInterviewStatusColor() }}
              />
              <ThemedText className="text-base">{getInterviewStatusText()}</ThemedText>
            </View>
            {interviewState.progress && (
              <View className="mt-2">
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  Questions answered: {interviewState.progress.questionsAnswered}
                </ThemedText>
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  Language: {interviewState.progress.language}
                </ThemedText>
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  Tests: {interviewState.progress.testTypes.join(', ')}
                </ThemedText>
            </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View className="space-y-4">
          {!interviewState?.isActive && !interviewState?.isPaused && !interviewState?.isMinimized ? (
            <TouchableOpacity
              onPress={handleStartNewInterview}
              disabled={isLoading || !selectedPatient}
              className={`flex-row items-center justify-center p-4 rounded-lg ${
                isLoading || !selectedPatient
                  ? 'bg-gray-300 dark:bg-gray-700'
                  : 'bg-blue-500 dark:bg-blue-600'
              }`}
            >
              <IconSymbol name="plus" size={20} color="white" />
              <ThemedText className="text-white font-semibold text-lg ml-2">
                {isLoading ? 'Starting...' : 'Start New Interview'}
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleResumeInterview}
              className="flex-row items-center justify-center p-4 rounded-lg bg-green-500 dark:bg-green-600"
            >
              <IconSymbol name="play" size={20} color="white" />
              <ThemedText className="text-white font-semibold text-lg ml-2">
                {interviewState?.isMinimized ? 'Restore Interview' : 'Continue Interview'}
              </ThemedText>
        </TouchableOpacity>
          )}

          {/* Development Tools */}
          <View className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <ThemedText className="text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
              Development Tools
            </ThemedText>
            <TouchableOpacity
              onPress={handleResetMockData}
              className="flex-row items-center justify-center p-3 bg-yellow-500 rounded-lg"
            >
              <IconSymbol name="arrow.clockwise" size={16} color="white" />
              <ThemedText className="text-white font-medium ml-2">
                Reset Mock Interview Data
              </ThemedText>
            </TouchableOpacity>
            <ThemedText className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 text-center">
              Use this to test the interview multiple times with mock data
            </ThemedText>
          </View>
    
          {/* Test Type Information */}
          <View className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <ThemedText className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
              Available Tests
            </ThemedText>
            <ThemedText className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              The interview will include:
            </ThemedText>
            <View className="space-y-1">
              <ThemedText className="text-sm text-blue-700 dark:text-blue-300">
                • Major Depressive Disorder (MDD) - Diagnostic screening
              </ThemedText>
              <ThemedText className="text-sm text-blue-700 dark:text-blue-300">
                • Depression - Severity assessment
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
              2. Click &quot;Start New Interview&quot; to begin
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              3. Answer questions as they appear
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              4. View results when complete
            </ThemedText>
              </View>
            </View>
          </ScrollView>
    </ThemedView>
      );
}