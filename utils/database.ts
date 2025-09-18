// Database API utilities for CAT-MH app
// Replace API_BASE_URL with your actual endpoint

export const API_BASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;

export interface Patient {
  id: number;
  emu_id: string;
  latest: boolean;
}

export interface Interview {
  id: number;
  patient_id: number;
  status: 'completed' | 'terminated' | 'in_progress';
  survey_type: string;
  catmh_id: number;
  start_time: Date;
  end_time?: Date;
  timeframe_id: number;
  diagnosis?: string;
  confidence?: number;
  severity?: number;
  category?: string;
  precision?: number;
  prob?: number;
  percentile?: number;
}

export interface Question {
  id: number;
  interview_id: number;
  question_id: number;
  display_duration: number; // in milliseconds
  response_id: number;
  response_weight: number;
  response_text: string;
  answer_list: string;
}

export const databaseAPI = {
  // ===== PATIENT MANAGEMENT =====
  
  // Fetch all patients from database
  async getPatients(): Promise<Patient[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const patients = await response.json();
      return patients.map((patient: any) => ({
        id: patient.id,
        emu_id: patient.emu_id,
        latest: patient.latest
      }));
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Return mock data for development
      return [
        { id: 1, emu_id: 'John Doe', latest: true },
        { id: 2, emu_id: 'Jane Smith', latest: false },
        { id: 3, emu_id: 'Bob Johnson', latest: false },
      ];
    }
  },

  // Create new patient in database
  async createPatient(emuId: string): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patient-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emu_id: emuId,
          latest: true, // New patient becomes the latest
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newPatient = await response.json();
      return {
        id: newPatient.id,
        emu_id: newPatient.emu_id,
        latest: newPatient.latest
      };
    } catch (error) {
      console.error('Error creating patient:', error);
      // Return mock data for development
      return {
        id: Date.now(),
        emu_id: emuId,
        latest: true
      };
    }
  },

  // Update patient in database
  async updatePatients(patients: Patient[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/patient-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patients),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return "patients updated successfully"
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  // Set a patient as the latest (and unset others)
  async setAsLatest(patient: Patient): Promise<void> {
    try {
      // First, unset all patients as latest
      let allPatients = await this.getPatients();
      // set all their 'latest' fields to false except this patient
      allPatients = allPatients.map(
        obj => (
          obj.id === patient.id ?
          {...obj, latest: true} :
          {...obj, latest: false}
        ));

      // now update patients
      await this.updatePatients(allPatients);
    } catch (error) {
      console.error('Error setting patient as latest:', error);
      throw error;
    }
  },

  // ===== INTERVIEW MANAGEMENT =====

  // Fetch interviews for a specific patient
  async getInterviews(patientIdOrPatient: string | Patient): Promise<Interview[]> {
    try {
      let patientId: number;
      
      if (typeof patientIdOrPatient === 'string') {
        // If we got a string (emu_id), look up the patient first
        const patientResponse = await fetch(`${API_BASE_URL}/patients/${patientIdOrPatient}`);
        if (!patientResponse.ok) {
          throw new Error(`HTTP error! status: ${patientResponse.status}`);
        }
        const patient = await patientResponse.json();
        
        if (!patient) {
          throw new Error('Patient not found');
        }
        
        patientId = patient.id;
      } else {
        // If we got a Patient object, use its id directly
        patientId = patientIdOrPatient.id;
      }
      
      // Now get interviews using the actual patient_id
      const response = await fetch(`${API_BASE_URL}/interviews/${patientId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const interviews = await response.json();
      return interviews.map((interview: any) => ({
        id: interview.id,
        patient_id: interview.patient_id,
        status: interview.status,
        catmh_id: interview.catmh_id,
        survey_type: interview.survey_type,
        start_time: new Date(interview.start_time),
        end_time: interview.end_time ? new Date(interview.end_time): undefined,
        timeframe_id: interview.timeframe_id,
        diagnosis: interview.diagnosis,
        confidence: interview.confidence,
        severity: interview.severity,
        category: interview.category,
        precision: interview.precision,
        prob: interview.prob,
        percentile: interview.percentile
      }));
    } catch (error) {
      console.error('Error fetching interviews:', error);
      // Return mock data for development
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      return [
        {
          id: 1,
          patient_id: 1, // Mock patient_id
          status: 'completed',
          survey_type: 'Depression Screening (PHQ-9)',
          catmh_id: 1,
          start_time: twoHoursAgo,
          end_time: oneHourAgo,
          timeframe_id: 1,
          diagnosis: 'Mild Depression',
          confidence: 0.85,
          severity: 6,
          category: 'Mood Disorder',
          precision: 0.92,
          prob: 0.78,
          percentile: 65
        },
        {
          id: 2,
          patient_id: 1, // Mock patient_id
          status: 'completed',
          survey_type: 'Anxiety Assessment (GAD-7)',
          catmh_id: 2,
          start_time: yesterday,
          end_time: new Date(yesterday.getTime() + 45 * 60 * 1000),
          timeframe_id: 1,
          diagnosis: 'Moderate Anxiety',
          confidence: 0.78,
          severity: 8,
          category: 'Anxiety Disorder',
          precision: 0.89,
          prob: 0.82,
          percentile: 78
        },
        {
          id: 3,
          patient_id: 1, // Mock patient_id
          status: 'in_progress',
          survey_type: 'Substance Use Screening',
          catmh_id: 3,
          start_time: now,
          timeframe_id: 1,
        }
      ];
    }
  },

  // Create new interview
  async createInterview(interview_info: Partial<Interview>): Promise<Interview> {
    try {
      const response = await fetch(`${API_BASE_URL}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interview_info),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newInterview = await response.json();
      return {
        id: newInterview.id,
        patient_id: newInterview.patient_id,
        survey_type: newInterview.survey_type,
        status: newInterview.status,
        start_time: new Date(newInterview.start_time),
        catmh_id: newInterview.catmh_id,
        timeframe_id: newInterview.timeframe_id,
      };
    } catch (error) {
      console.error('Error creating interview:', error);
      throw error;
    }
  },

  // Update interview status
  async updateInterview(interview_data: Interview): Promise<Interview> {
    try {
      const response = await fetch(`${API_BASE_URL}/interview-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interview_data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedInterview = await response.json();
      return {
        id: updatedInterview.id,
        patient_id: updatedInterview.patient_id,
        survey_type: updatedInterview.survey_type,
        status: updatedInterview.status,
        catmh_id: updatedInterview.catmh_id,
        timeframe_id: updatedInterview.timeframe_id,
        start_time: new Date(updatedInterview.start_time),
        end_time: updatedInterview.end_time ? new Date(updatedInterview.end_time) : undefined,
        diagnosis: updatedInterview.diagnosis,
        confidence: updatedInterview.confidence,
        severity: updatedInterview.severity,
        category: updatedInterview.category,
        precision: updatedInterview.precision,
        prob: updatedInterview.prob,
        percentile: updatedInterview.percentile,
      };
    } catch (error) {
      console.error('Error updating interview:', error);
      throw error;
    }
  },

  // ===== QUESTION MANAGEMENT =====

  // Add a new question to the database
  async addQuestion(question: Omit<Question, 'id'>): Promise<Question> {
    try {
      const response = await fetch(`${API_BASE_URL}/question-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(question),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newQuestion = await response.json();
      return {
        id: newQuestion.id,
        interview_id: newQuestion.interview_id,
        question_id: newQuestion.question_id,
        display_duration: newQuestion.display_duration,
        response_id: newQuestion.response_id,
        response_weight: newQuestion.response_weight,
        response_text: newQuestion.response_text,
        answer_list: newQuestion.answer_list,
      };
    } catch (error) {
      console.error('Error adding question:', error);
      throw error;
    }
  },

  // Get all questions for a specific interview
  async getQuestionsForInterview(interviewId: number): Promise<Question[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/${interviewId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const questions = await response.json();
      return questions.map((question: any) => ({
        id: question.id,
        interview_id: question.interview_id,
        question_id: question.question_id,
        display_duration: question.display_duration,
        response_id: question.response_id,
        response_weight: question.response_weight,
        response_text: question.response_text,
        answer_list: question.answer_list,
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  },

  // Add multiple questions at once (useful for batch operations)
  async addQuestions(questions: Omit<Question, 'id'>[]): Promise<Question[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/questions-batch-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questions),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newQuestions = await response.json();
      return newQuestions.map((question: any) => ({
        id: question.id,
        interview_id: question.interview_id,
        question_id: question.question_id,
        display_duration: question.display_duration,
        response_id: question.response_id,
        response_weight: question.response_weight,
        response_text: question.response_text,
        answer_list: question.answer_list,
      }));
    } catch (error) {
      console.error('Error adding questions:', error);
      throw error;
    }
  },
};
