// Database API utilities for CAT-MH app
// Replace API_BASE_URL with your actual endpoint

export const API_BASE_URL = 'https://your-api-endpoint.com/api';

export interface Patient {
  id: string;
  name: string;
  isLatest?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Interview {
  id: string;
  patientId: string;
  surveyType: string;
  status: 'completed' | 'terminated' | 'in_progress';
  date: string;
  time: string;
  duration: string;
  results?: any;
  createdAt?: string;
  updatedAt?: string;
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
        name: patient.name,
        isLatest: patient.isLatest || false,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      }));
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Return mock data for development
      return [
        { id: '1', name: 'John Doe', isLatest: true, createdAt: '2024-01-01', updatedAt: '2024-01-15' },
        { id: '2', name: 'Jane Smith', isLatest: false, createdAt: '2024-01-10', updatedAt: '2024-01-10' },
        { id: '3', name: 'Bob Johnson', isLatest: false, createdAt: '2024-01-05', updatedAt: '2024-01-05' },
      ];
    }
  },

  // Create new patient in database
  async createPatient(patientName: string): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: patientName,
          isLatest: true, // New patient becomes the latest
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newPatient = await response.json();
      return {
        id: newPatient.id,
        name: newPatient.name,
        isLatest: newPatient.isLatest,
        createdAt: newPatient.createdAt,
        updatedAt: newPatient.updatedAt,
      };
    } catch (error) {
      console.error('Error creating patient:', error);
      // Return mock data for development
      return {
        id: Date.now().toString(),
        name: patientName,
        isLatest: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  // Update patient in database
  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedPatient = await response.json();
      return {
        id: updatedPatient.id,
        name: updatedPatient.name,
        isLatest: updatedPatient.isLatest,
        createdAt: updatedPatient.createdAt,
        updatedAt: updatedPatient.updatedAt,
      };
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  // Set a patient as the latest (and unset others)
  async setAsLatest(patientId: string): Promise<void> {
    try {
      // First, unset all patients as latest
      await fetch(`${API_BASE_URL}/patients/unset-latest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Then set the specified patient as latest
      await this.updatePatient(patientId, { isLatest: true });
    } catch (error) {
      console.error('Error setting patient as latest:', error);
      throw error;
    }
  },

  // ===== INTERVIEW MANAGEMENT =====

  // Fetch interviews for a specific patient
  async getInterviews(patientId: string): Promise<Interview[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}/interviews`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const interviews = await response.json();
      return interviews.map((interview: any) => ({
        id: interview.id,
        patientId: interview.patientId,
        surveyType: interview.surveyType,
        status: interview.status,
        date: interview.date,
        time: interview.time,
        duration: interview.duration,
        results: interview.results,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
      }));
    } catch (error) {
      console.error('Error fetching interviews:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          patientId,
          surveyType: 'Depression Screening',
          status: 'completed',
          date: '2024-01-15',
          time: '14:30',
          duration: '25 min',
          createdAt: '2024-01-15T14:30:00Z',
          updatedAt: '2024-01-15T14:55:00Z',
        },
        {
          id: '2',
          patientId,
          surveyType: 'Anxiety Assessment',
          status: 'completed',
          date: '2024-01-10',
          time: '09:15',
          duration: '18 min',
          createdAt: '2024-01-10T09:15:00Z',
          updatedAt: '2024-01-10T09:33:00Z',
        },
      ];
    }
  },

  // Create new interview
  async createInterview(patientId: string, surveyType: string): Promise<Interview> {
    try {
      const response = await fetch(`${API_BASE_URL}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          surveyType,
          status: 'in_progress',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newInterview = await response.json();
      return {
        id: newInterview.id,
        patientId: newInterview.patientId,
        surveyType: newInterview.surveyType,
        status: newInterview.status,
        date: newInterview.date,
        time: newInterview.time,
        duration: newInterview.duration,
        createdAt: newInterview.createdAt,
        updatedAt: newInterview.updatedAt,
      };
    } catch (error) {
      console.error('Error creating interview:', error);
      throw error;
    }
  },

  // Update interview status
  async updateInterview(interviewId: string, updates: Partial<Interview>): Promise<Interview> {
    try {
      const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedInterview = await response.json();
      return {
        id: updatedInterview.id,
        patientId: updatedInterview.patientId,
        surveyType: updatedInterview.surveyType,
        status: updatedInterview.status,
        date: updatedInterview.date,
        time: updatedInterview.time,
        duration: updatedInterview.duration,
        results: updatedInterview.results,
        createdAt: updatedInterview.createdAt,
        updatedAt: updatedInterview.updatedAt,
      };
    } catch (error) {
      console.error('Error updating interview:', error);
      throw error;
    }
  },

  // ===== SURVEY RESULTS =====

  // Save survey results
  async saveSurveyResults(interviewId: string, results: any): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(results),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error saving survey results:', error);
      throw error;
    }
  },

  // Get survey results
  async getSurveyResults(interviewId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}/results`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching survey results:', error);
      throw error;
    }
  },
};
