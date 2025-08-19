import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CATMHQuestionResponse } from '@/utils/catmh';
import { InterviewOrchestrator, InterviewProgress } from '@/utils/interviewOrchestrator';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, TouchableOpacity, View } from 'react-native';

interface InterviewDrawerProps {
  orchestrator: InterviewOrchestrator;
  isVisible: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export default function InterviewDrawer({ 
  orchestrator, 
  isVisible, 
  onClose, 
  onMinimize 
}: InterviewDrawerProps) {
  const [currentQuestion, setCurrentQuestion] = useState<CATMHQuestionResponse | null>(null);
  const [progress, setProgress] = useState<InterviewProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    if (isVisible && orchestrator) {
      loadCurrentQuestion();
      updateProgress();
    }
  }, [isVisible, orchestrator]);

  const loadCurrentQuestion = async () => {
    try {
      const question = await orchestrator.getCurrentQuestion();
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error loading current question:', error);
    }
  };

  const updateProgress = () => {
    const currentProgress = orchestrator.getProgress();
    setProgress(currentProgress);
  };

  const handleAnswerSubmit = async (response: number | number[]) => {
    if (!currentQuestion) return;

    setIsLoading(true);
    try {
      await orchestrator.submitAnswer(response);
      
      // Get the next question
      const nextQuestion = await orchestrator.getCurrentQuestion();
      setCurrentQuestion(nextQuestion);
      updateProgress();
      
      if (!nextQuestion) {
        // Interview is complete
        handleInterviewComplete();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterviewComplete = async () => {
    try {
      const results = await orchestrator.getInterviewResults();
      Alert.alert(
        'Interview Complete!',
        `Results:\n\n${results?.tests.map(test => 
          `${test.label}: ${test.diagnosis || test.category || 'N/A'}`
        ).join('\n')}`,
        [
          {
            text: 'View Details',
            onPress: () => {
              // TODO: Navigate to results screen
              console.log('Results:', results);
            }
          },
          {
            text: 'Close',
            onPress: onClose,
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error getting results:', error);
      Alert.alert('Error', 'Failed to retrieve interview results.');
    }
  };

  const handleCloseInterview = () => {
    setShowCloseModal(true);
  };

  const handleCloseConfirm = (action: 'close' | 'minimize') => {
    setShowCloseModal(false);
    
    if (action === 'close') {
      // Terminate the interview
      orchestrator.terminateInterview();
      onClose();
    } else if (action === 'minimize') {
      // Minimize the interview
      orchestrator.minimizeInterview();
      onMinimize();
    }
  };

  const getProgressPercentage = () => {
    if (!progress || !currentQuestion) return 0;
    
    // Estimate total questions based on test types
    const estimatedTotal = progress.testTypes.length * 10; // Rough estimate
    return Math.min((progress.questionsAnswered / estimatedTotal) * 100, 100);
  };

  const renderQuestion = () => {
    if (!currentQuestion) {
      return (
        <View className="flex-1 justify-center items-center">
          <ThemedText className="text-lg text-gray-600 dark:text-gray-400">
            Loading question...
          </ThemedText>
        </View>
      );
    }

    return (
      <View className="flex-1">
        {/* Question Header */}
        <View className="mb-4">
          <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Question {currentQuestion.questionNumber + 1}
          </ThemedText>
          {currentQuestion.questionNote && (
            <View className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ThemedText className="text-sm text-blue-700 dark:text-blue-300">
                {currentQuestion.questionNote}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Question Text */}
        <View className="mb-6">
          <ThemedText className="text-lg font-medium text-gray-900 dark:text-gray-100 leading-6">
            {currentQuestion.questionDescription}
          </ThemedText>
        </View>

        {/* Answer Options */}
        <View className="space-y-3">
          {currentQuestion.questionAnswers.map((answer) => (
            <TouchableOpacity
              key={answer.answerOrdinal}
              onPress={() => handleAnswerSubmit(answer.answerOrdinal)}
              disabled={isLoading}
              className={`p-4 border-2 rounded-lg ${
                isLoading
                  ? 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                  : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700 hover:border-blue-500'
              }`}
            >
              <ThemedText className={`text-base ${
                isLoading
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {answer.answerDescription}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Question Footer */}
        {currentQuestion.questionFooter && (
          <View className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {currentQuestion.questionFooter}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ThemedView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center">
            <IconSymbol name="doc.text" size={24} color="#3B82F6" />
            <ThemedText className="text-xl font-bold ml-2">Mental Health Assessment</ThemedText>
          </View>
          <TouchableOpacity onPress={handleCloseInterview} className="p-2">
            <IconSymbol name="xmark" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        {progress && (
          <View className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
            <View className="flex-row items-center justify-between mb-2">
              <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(getProgressPercentage())}%
              </ThemedText>
            </View>
            <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <View 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </View>
            <View className="flex-row justify-between mt-1">
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                {progress.questionsAnswered} answered
              </ThemedText>
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                {progress.language} • {progress.testTypes.join(', ')}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Question Content */}
        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          {renderQuestion()}
        </ScrollView>

        {/* Loading Overlay */}
        {isLoading && (
          <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
            <View className="bg-white dark:bg-gray-800 p-6 rounded-lg">
              <ThemedText className="text-lg font-medium text-center">
                Submitting answer...
              </ThemedText>
            </View>
          </View>
        )}

        {/* Close Confirmation Modal */}
        <Modal
          visible={showCloseModal}
          transparent
          animationType="fade"
        >
          <View className="flex-1 bg-black bg-opacity-50 justify-center items-center">
            <View className="bg-white dark:bg-gray-800 p-6 rounded-lg mx-4 w-80">
              <ThemedText className="text-lg font-bold mb-4 text-center">
                What would you like to do?
              </ThemedText>
              
              <TouchableOpacity
                onPress={() => handleCloseConfirm('minimize')}
                className="mb-3 p-4 bg-blue-500 rounded-lg"
              >
                <ThemedText className="text-white font-medium text-center">
                  Pause & Minimize
                </ThemedText>
                <ThemedText className="text-blue-100 text-sm text-center mt-1">
                  Interview will continue running in background
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleCloseConfirm('close')}
                className="mb-4 p-4 bg-red-500 rounded-lg"
              >
                <ThemedText className="text-white font-medium text-center">
                  Close Interview
                </ThemedText>
                <ThemedText className="text-red-100 text-sm text-center mt-1">
                  Interview will be terminated permanently
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowCloseModal(false)}
                className="p-3"
              >
                <ThemedText className="text-gray-500 text-center">
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </Modal>
  );
}
