// Interview Orchestrator for managing complete interview sessions using the official CAT-MH API
import {
  CATMHAnswerSubmission,
  catmhAPI,
  CATMHCookies,
  CATMHInterviewCreateRequest,
  CATMHInterviewCreateResponse,
  CATMHInterviewInitResponse,
  CATMHInterviewResults,
  CATMHQuestionResponse
} from './catmh';
import { databaseAPI, Interview, Question } from './database';

export interface InterviewProgress {
  interviewId: number;
  subjectId: string;
  currentQuestion: CATMHQuestionResponse | null;
  isComplete: boolean;
  isInitialized: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  questionsAnswered: number;
  totalQuestions?: number;
  language: string;
  testTypes: string[];
  startTime: number | null;
  lastActivityTime: number;
}

export interface InterviewCallbacks {
  onQuestionReceived?: (question: CATMHQuestionResponse) => void;
  onAnswerSubmitted?: (answer: CATMHAnswerSubmission) => void;
  onProgressUpdate?: (progress: InterviewProgress) => void;
  onInterviewComplete?: (results: CATMHInterviewResults) => void;
  onInterviewInitialized?: (initResponse: CATMHInterviewInitResponse) => void;
  onInterviewPaused?: () => void;
  onInterviewResumed?: () => void;
  onInterviewMinimized?: () => void;
  onInterviewRestored?: () => void;
  onError?: (error: Error) => void;
}

export interface InterviewState {
  isActive: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  progress: InterviewProgress | null;
  cookies: CATMHCookies | null;
  interviewData: CATMHInterviewCreateResponse['interviews'][0] | null;
}

export class InterviewOrchestrator {
  private currentInterview: CATMHInterviewCreateResponse['interviews'][0] | null = null;
  private currentCookies: CATMHCookies | null = null;
  private currentProgress: InterviewProgress | null = null;
  private callbacks: InterviewCallbacks = {};
  private isRunning = false;
  private questionStartTime: number = 0;
  private sessionTimeout: number | null = null;
  private isPaused = false;
  private isMinimized = false;

  constructor(callbacks: InterviewCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // Set callbacks for interview events
  setCallbacks(callbacks: InterviewCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get current interview state
  getInterviewState(): InterviewState {
    return {
      isActive: this.isRunning && !this.isPaused && !this.isMinimized,
      isPaused: this.isPaused,
      isMinimized: this.isMinimized,
      progress: this.currentProgress,
      cookies: this.currentCookies,
      interviewData: this.currentInterview,
    };
  }

  // Check if there's an existing active interview for a subject
  async checkExistingInterview(
    organizationID: number,
    subjectID: string
  ): Promise<CATMHInterviewCreateResponse['interviews'][0] | null> {
    try {
      // In a real implementation, you'd check your database for existing interviews
      // For now, we'll return null to always create new interviews
      return null;
    } catch (error) {
      console.error('Error checking for existing interview:', error);
      return null;
    }
  }

  // Create a new interview for a subject
  async createInterview(
    organizationID: number,
    subjectID: string,
    tests: string[],
    language: number = 1,
    timeframeID: number = 4
  ): Promise<CATMHInterviewCreateResponse> {
    try {
      const request: CATMHInterviewCreateRequest = {
        organizationID,
        userFirstName: 'Automated',
        userLastName: 'Creation',
        subjectID,
        numberOfInterviews: 1,
        language,
        timeframeID,
        tests: tests.map(type => ({ type })),
        complEmailFlag: 0, // No completion email
      };

      const response = await catmhAPI.createInterview(request);
      
      if (response.interviews && response.interviews.length > 0) {
        this.currentInterview = response.interviews[0];
        console.log('Created new interview:', this.currentInterview.interviewID);
      }

      return response;
    } catch (error) {
      console.error('Error creating interview:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  // Start administering an interview
  async startInterview(
    organizationID: number,
    subjectID: string,
    tests: string[],
    language: number = 1,
    timeframeID: number = 4
  ): Promise<CATMHInterviewInitResponse> {
    try {
      // Create the interview if we don't have one
      if (!this.currentInterview) {
        await this.createInterview(organizationID, subjectID, tests, language, timeframeID);
      }

      if (!this.currentInterview) {
        throw new Error('Failed to create interview');
      }

      // Sign in to the interview
      this.currentCookies = await catmhAPI.signInToInterview({
        j_username: this.currentInterview.identifier,
        j_password: this.currentInterview.signature,
        interviewID: this.currentInterview.interviewID,
      });

      // Initialize the interview
      const initResponse = await catmhAPI.initializeInterview(this.currentCookies);
      
      // Set up progress tracking
      this.currentProgress = {
        interviewId: initResponse.id,
        subjectId: subjectID,
        currentQuestion: null,
        isComplete: false,
        isInitialized: true,
        isPaused: false,
        isMinimized: false,
        questionsAnswered: 0,
        language: catmhAPI.getLanguageName(initResponse.languageID),
        testTypes: initResponse.interviewTests.map(testId => this.getTestTypeFromId(testId)),
        startTime: initResponse.startTime,
        lastActivityTime: Date.now(),
      };

      // Set up session timeout (30 minutes as per API docs)
      this.setupSessionTimeout();

      this.callbacks.onInterviewInitialized?.(initResponse);
      this.updateProgress();

      return initResponse;
    } catch (error) {
      console.error('Error starting interview:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  // Resume a paused interview
  async resumeInterview(): Promise<void> {
    if (!this.currentCookies || !this.currentProgress) {
      throw new Error('No active interview to resume');
    }

    try {
      this.isPaused = false;
      this.currentProgress.isPaused = false;
      this.currentProgress.lastActivityTime = Date.now();
      
      // Reset session timeout
      this.resetSessionTimeout();
      
      this.callbacks.onInterviewResumed?.();
      this.updateProgress();
    } catch (error) {
      console.error('Error resuming interview:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  // Pause the current interview
  async pauseInterview(): Promise<void> {
    if (!this.currentProgress) {
      throw new Error('No active interview to pause');
    }

    try {
      this.isPaused = true;
      this.currentProgress.isPaused = true;
      this.currentProgress.lastActivityTime = Date.now();
      
      this.callbacks.onInterviewPaused?.();
      this.updateProgress();
    } catch (error) {
      console.error('Error pausing interview:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  // Minimize the interview (keep it running but hide UI)
  async minimizeInterview(): Promise<void> {
    if (!this.currentProgress) {
      throw new Error('No active interview to minimize');
    }

    try {
      this.isMinimized = true;
      this.currentProgress.isMinimized = true;
      this.currentProgress.lastActivityTime = Date.now();
      
      this.callbacks.onInterviewMinimized?.();
      this.updateProgress();
    } catch (error) {
      console.error('Error minimizing interview:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  // Restore a minimized interview
  async restoreInterview(): Promise<void> {
    if (!this.currentProgress) {
      throw new Error('No active interview to restore');
    }

    try {
      this.isMinimized = false;
      this.currentProgress.isMinimized = false;
      this.currentProgress.lastActivityTime = Date.now();
      
      // Reset session timeout
      this.resetSessionTimeout();
      
      this.callbacks.onInterviewRestored?.();
      this.updateProgress();
    } catch (error) {
      console.error('Error restoring interview:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  // Get the current question and start timing
  async getCurrentQuestion(): Promise<CATMHQuestionResponse | null> {
    if (!this.currentCookies) {
      throw new Error('No active interview session');
    }

    try {
      const question = await catmhAPI.getCurrentQuestion(this.currentCookies);
      
      if (question) {
        this.currentProgress!.currentQuestion = question;
        this.questionStartTime = Date.now();
        this.currentProgress!.lastActivityTime = Date.now();
        
        this.callbacks.onQuestionReceived?.(question);
        this.updateProgress();
        
        // Reset session timeout
        this.resetSessionTimeout();
      } else {
        // Interview is complete
        this.currentProgress!.isComplete = true;
        this.updateProgress();
      }

      return question;
    } catch (error) {
      console.error('Error getting current question:', error);
      this.callbacks.onError?.(error as Error);
      return null;
    }
  }

  // Submit an answer and move to next question
  async submitAnswer(response: number | number[]): Promise<void> {
    if (!this.currentCookies || !this.currentProgress?.currentQuestion) {
      throw new Error('No active question to answer');
    }

    try {
      const responseTime = Date.now() - this.questionStartTime;
      const question = this.currentProgress.currentQuestion;
      
      let answer: CATMHAnswerSubmission;
      
      if (question.answerType === 1) {
        // Radio button question
        answer = {
          questionID: question.questionID,
          response: response as number,
          duration: responseTime,
          curT1: 0,
          curT2: 0,
          curT3: 0,
        };
      } else {
        // Checkbox question
        answer = {
          questionID: question.questionID,
          chkResponses: response as number[],
          duration: responseTime,
          curT1: 0,
          curT2: 0,
          curT3: 0,
        };
      }

      // Submit to CATMH API
      await catmhAPI.submitAnswer(this.currentCookies!, answer);

      // Store question data in our database
      const questionData: Omit<Question, 'id'> = {
        interview_id: this.currentProgress.interviewId,
        question_id: question.questionID,
        display_duration: responseTime,
        response_id: Array.isArray(response) ? response[0] : response,
        response_weight: 1.0, // This might need to come from CATMH API
        response_text: Array.isArray(response) ? response.join(',') : response.toString(),
        answer_list: JSON.stringify(Array.isArray(response) ? response : [response]),
      };

      await databaseAPI.addQuestion(questionData);

      this.callbacks.onAnswerSubmitted?.(answer);
      this.currentProgress!.questionsAnswered++;
      this.currentProgress!.lastActivityTime = Date.now();
      this.updateProgress();

      // Reset session timeout
      this.resetSessionTimeout();
    } catch (error) {
      console.error('Error submitting answer:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  // Get interview results
  async getInterviewResults(includeItemLevel: boolean = false): Promise<CATMHInterviewResults | null> {
    if (!this.currentCookies) {
      throw new Error('No active interview session');
    }

    try {
      const results = await catmhAPI.getInterviewResults(this.currentCookies, includeItemLevel);
      
      // Update our database with final results
      if (this.currentProgress) {
        const interviewUpdate: Partial<Interview> = {
          status: 'completed',
          end_time: results.endTime ? new Date(results.endTime) : new Date(),
          // Map test results to interview fields
          diagnosis: this.extractDiagnosisFromResults(results),
          confidence: this.extractConfidenceFromResults(results),
          severity: this.extractSeverityFromResults(results),
          category: this.extractCategoryFromResults(results),
          precision: this.extractPrecisionFromResults(results),
          prob: this.extractProbabilityFromResults(results),
          percentile: this.extractPercentileFromResults(results),
        };

        // Note: You'll need to implement updateInterview in databaseAPI
        // await databaseAPI.updateInterview(interviewUpdate as Interview);
      }

      return results;
    } catch (error) {
      console.error('Error getting interview results:', error);
      this.callbacks.onError?.(error as Error);
      return null;
    }
  }

  // Terminate the interview (close permanently)
  async terminateInterview(): Promise<void> {
    try {
      if (this.currentCookies) {
        await catmhAPI.signOut(this.currentCookies);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }

    this.cleanup();
  }

  // Sign out and terminate the interview session
  async signOut(): Promise<void> {
    await this.terminateInterview();
  }

  // Get current progress
  getProgress(): InterviewProgress | null {
    return this.currentProgress;
  }

  // Update progress and notify callbacks
  private updateProgress(): void {
    if (this.currentProgress) {
      this.callbacks.onProgressUpdate?.(this.currentProgress);
    }
  }

  // Set up session timeout (30 minutes as per API docs)
  private setupSessionTimeout(): void {
    this.sessionTimeout = setTimeout(() => {
      console.warn('CATMH session timeout - 30 minutes of inactivity');
      this.callbacks.onError?.(new Error('Session timeout - 30 minutes of inactivity'));
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Reset session timeout
  private resetSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.setupSessionTimeout();
    }
  }

  // Get test type name from test ID
  private getTestTypeFromId(testId: number): string {
    // This mapping would need to be provided by CATMH or determined empirically
    const testTypeMap: { [key: number]: string } = {
      1: 'mdd',
      2: 'dep',
      3: 'anx',
      4: 'm/hm',
      5: 'sud',
      6: 'ptsd-dx',
      7: 'ptsd',
      8: 'ptsd-e',
      9: 'psy-c',
      10: 'psy-s',
      11: 'a/adhd',
      12: 'sdoh',
      13: 'c-ssrs',
      14: 'ss',
      // Add more mappings as needed
    };
    return testTypeMap[testId] || `test_${testId}`;
  }

  // Extract diagnosis from test results
  private extractDiagnosisFromResults(results: CATMHInterviewResults): string | undefined {
    for (const test of results.tests) {
      if (test.diagnosis) {
        return test.diagnosis;
      }
    }
    return undefined;
  }

  // Extract confidence from test results
  private extractConfidenceFromResults(results: CATMHInterviewResults): number | undefined {
    for (const test of results.tests) {
      if (test.confidence !== null) {
        return test.confidence;
      }
    }
    return undefined;
  }

  // Extract severity from test results
  private extractSeverityFromResults(results: CATMHInterviewResults): number | undefined {
    for (const test of results.tests) {
      if (test.severity !== null) {
        return test.severity;
      }
    }
    return undefined;
  }

  // Extract category from test results
  private extractCategoryFromResults(results: CATMHInterviewResults): string | undefined {
    for (const test of results.tests) {
      if (test.category) {
        return test.category;
      }
    }
    return undefined;
  }

  // Extract precision from test results
  private extractPrecisionFromResults(results: CATMHInterviewResults): number | undefined {
    for (const test of results.tests) {
      if (test.precision !== null) {
        return test.precision;
      }
    }
    return undefined;
  }

  // Extract probability from test results
  private extractProbabilityFromResults(results: CATMHInterviewResults): number | undefined {
    for (const test of results.tests) {
      if (test.prob !== null) {
        return test.prob;
      }
    }
    return undefined;
  }

  // Extract percentile from test results
  private extractPercentileFromResults(results: CATMHInterviewResults): number | undefined {
    for (const test of results.tests) {
      if (test.percentile !== null) {
        return test.percentile;
      }
    }
    return undefined;
  }

  // Main interview loop - this is the core function you requested
  async doWholeInterview(
    organizationID: number,
    subjectID: string,
    tests: string[],
    language: number = 1,
    timeframeID: number = 4
  ): Promise<CATMHInterviewResults | null> {
    try {
      this.isRunning = true;
      
      // Start the interview
      await this.startInterview(organizationID, subjectID, tests, language, timeframeID);
      
      // Main interview loop
      while (this.isRunning && this.currentProgress && !this.currentProgress.isComplete) {
        // Check if interview is paused or minimized
        if (this.currentProgress.isPaused || this.currentProgress.isMinimized) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Get current question
        const question = await this.getCurrentQuestion();
        if (!question) {
          // Interview is complete
          break;
        }

        // Wait for answer to be submitted (this should be handled by your UI)
        // The actual answer submission happens in submitAnswer() method
        // This loop just manages the flow
        
        // Small delay to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Get final results if interview completed
      if (this.currentProgress?.isComplete) {
        const results = await this.getInterviewResults();
        return results;
      }

      return null;
    } catch (error) {
      console.error('Error in doWholeInterview:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Stop the interview loop
  stopInterview(): void {
    this.isRunning = false;
  }

  // Clean up resources
  cleanup(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    this.currentInterview = null;
    this.currentCookies = null;
    this.currentProgress = null;
    this.isRunning = false;
    this.isPaused = false;
    this.isMinimized = false;
  }
}
