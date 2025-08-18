// Example usage of the Interview Orchestrator with the official CAT-MH API
import { CATMHQuestionResponse } from './catmh';
import { InterviewOrchestrator } from './interviewOrchestrator';

// Example of how to use the Interview Orchestrator in your React Native app
export class InterviewManager {
  private orchestrator: InterviewOrchestrator;
  private currentQuestion: CATMHQuestionResponse | null = null;
  private organizationID: number;
  private subjectID: string;

  constructor(organizationID: number, subjectID: string) {
    this.organizationID = organizationID;
    this.subjectID = subjectID;
    
    // Initialize the orchestrator with callbacks
    this.orchestrator = new InterviewOrchestrator({
      onQuestionReceived: (question) => {
        console.log('New question received:', question.questionDescription);
        this.currentQuestion = question;
        // Update your UI here
        this.displayQuestion(question);
      },
      
      onAnswerSubmitted: (answer) => {
        console.log('Answer submitted:', answer);
        // Clear the current question display
        this.currentQuestion = null;
        // Update your UI here
        this.clearQuestionDisplay();
      },
      
      onProgressUpdate: (progress) => {
        console.log('Interview progress:', progress);
        // Update progress bar, question counter, etc.
        this.updateProgressUI(progress);
      },
      
      onInterviewInitialized: (initResponse) => {
        console.log('Interview initialized:', initResponse);
        // Show interview start screen
        this.showInterviewStartScreen(initResponse);
      },
      
      onInterviewComplete: (results) => {
        console.log('Interview completed with results:', results);
        // Show completion screen with results
        this.showCompletionScreen(results);
      },
      
      onError: (error) => {
        console.error('Interview error:', error);
        // Show error message to user
        this.showErrorMessage(error.message);
      },
    });
  }

  // Start a new interview
  async startInterview(tests: string[], language: number = 1, timeframeID: number = 4): Promise<void> {
    try {
      await this.orchestrator.startInterview(
        this.organizationID,
        this.subjectID,
        tests,
        language,
        timeframeID
      );
      // Get the first question
      await this.orchestrator.getCurrentQuestion();
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  }

  // Submit an answer (called from your UI when user selects an answer)
  async submitAnswer(response: number | number[]): Promise<void> {
    if (!this.currentQuestion) {
      console.warn('No current question to answer');
      return;
    }

    try {
      await this.orchestrator.submitAnswer(response);
      // The orchestrator will automatically get the next question
      // via the onAnswerSubmitted callback
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  }

  // Get interview results
  async getResults(includeItemLevel: boolean = false): Promise<any> {
    try {
      return await this.orchestrator.getInterviewResults(includeItemLevel);
    } catch (error) {
      console.error('Failed to get results:', error);
      return null;
    }
  }

  // Sign out and terminate the interview session
  async signOut(): Promise<void> {
    try {
      await this.orchestrator.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  // Get current progress
  getProgress() {
    return this.orchestrator.getProgress();
  }

  // Clean up when done
  cleanup(): void {
    this.orchestrator.cleanup();
  }

  // ===== UI Update Methods (implement these based on your UI framework) =====
  
  private displayQuestion(question: CATMHQuestionResponse): void {
    // Update your UI to show the question
    // This will depend on your React Native component structure
    console.log('Displaying question:', question.questionDescription);
    console.log('Answer options:', question.questionAnswers.map(a => a.answerDescription));
  }

  private clearQuestionDisplay(): void {
    // Clear the question display
    console.log('Clearing question display');
  }

  private updateProgressUI(progress: any): void {
    // Update progress indicators
    console.log('Updating progress UI:', progress);
  }

  private showInterviewStartScreen(initResponse: any): void {
    // Show interview start screen
    console.log('Showing interview start screen');
  }

  private showCompletionScreen(results: any): void {
    // Show completion screen
    console.log('Showing completion screen');
  }

  private showErrorMessage(message: string): void {
    // Show error message
    console.log('Showing error message:', message);
  }
}

// Example usage in a React Native component:
/*
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { InterviewManager } from './interviewExample';

export default function InterviewScreen() {
  const [interviewManager] = useState(() => new InterviewManager(1, 'patient123'));
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);

  useEffect(() => {
    // Set up callbacks
    interviewManager.orchestrator.setCallbacks({
      onQuestionReceived: (question) => {
        setCurrentQuestion(question);
        setIsInterviewActive(true);
      },
      onAnswerSubmitted: () => {
        setCurrentQuestion(null);
      },
      onInterviewComplete: (results) => {
        setIsInterviewActive(false);
        Alert.alert('Interview Complete', `Results: ${JSON.stringify(results)}`);
      },
    });

    return () => {
      interviewManager.cleanup();
    };
  }, []);

  const startInterview = async () => {
    try {
      // Start with MDD and Depression tests
      await interviewManager.startInterview(['mdd', 'dep'], 1, 4);
    } catch (error) {
      Alert.alert('Error', 'Failed to start interview');
    }
  };

  const submitAnswer = async (response: number | number[]) => {
    try {
      await interviewManager.submitAnswer(response);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit answer');
    }
  };

  return (
    <View>
      {!isInterviewActive ? (
        <Button title="Start Interview" onPress={startInterview} />
      ) : (
        <View>
          {currentQuestion && (
            <View>
              <Text>{currentQuestion.questionDescription}</Text>
              {currentQuestion.questionAnswers.map((answer, index) => (
                <Button
                  key={index}
                  title={answer.answerDescription}
                  onPress={() => submitAnswer(answer.answerOrdinal)}
                />
              ))}
            </View>
          )}
          <Button title="Sign Out" onPress={() => interviewManager.signOut()} />
        </View>
      )}
    </View>
  );
}
*/
