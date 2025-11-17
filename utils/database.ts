// SIMPLIFIED DATABASE API FOR 2-SCALE RATING SYSTEM
// Much simpler than the complex CATMH system!

export const API_BASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;

export interface Patient {
  id: number;
  emu_id: string;
  latest: boolean;
}

export interface SimpleInterview {
  id: number;
  patient_id: number;
  mood_rating: number;  // 1-7 scale
  energy_rating: number;  // 1-7 scale
  pain_rating: number;
  timestamp_start: Date;
  timestamp_save: Date;
  status: 'completed' | 'draft';
}

export interface NotificationSchedule {
  id: number;
  token_id: number;
  freq_minutes: number;
  duration_days: number;
  start_time_iso: Date;
  admin_timezone: string;
  active: boolean;
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

  // ===== SIMPLE INTERVIEW MANAGEMENT =====

  // Fetch simple interviews for a specific patient
  async getSimpleInterviews(patient: Patient): Promise<SimpleInterview[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/simple-interviews/${patient.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const interviews = await response.json();
      return interviews.map((interview: any) => ({
        id: interview.id,
        patient_id: interview.patient_id,
        mood_rating: interview.mood_rating,
        energy_rating: interview.energy_rating,
        pain_rating: interview.pain_rating,
        timestamp_start: new Date(interview.timestamp_start),
        timestamp_save: new Date(interview.timestamp_save),
        status: interview.status
      }));
    } catch (error) {
      console.error('Error fetching simple interviews:', error);
      // Return mock data for development
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      return [
        {
          id: 1,
          patient_id: patient.id,
          mood_rating: 5,
          energy_rating: 6,
          pain_rating: 4,
          timestamp_start: twoHoursAgo,
          timestamp_save: twoHoursAgo,
          status: 'completed'
        },
        {
          id: 2,
          patient_id: patient.id,
          mood_rating: 3,
          energy_rating: 4,
          pain_rating: 5,
          timestamp_start: twoHoursAgo,
          timestamp_save: yesterday,
          status: 'completed'
        },
        {
          id: 3,
          patient_id: patient.id,
          mood_rating: 6,
          energy_rating: 7,
          pain_rating: 3,
          timestamp_start: threeDaysAgo,
          timestamp_save: threeDaysAgo,
          status: 'completed'
        }
      ];
    }
  },

  // Save a new simple interview (mood + energy rating)
  async saveSimpleInterview(interviewData: {
    patient_id: number;
    mood_rating: number;
    energy_rating: number;
    pain_rating: number;
    timestamp_start: Date;
    status?: 'completed' | 'draft';
  }): Promise<SimpleInterview> {
    try {
      const response = await fetch(`${API_BASE_URL}/simple-interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...interviewData,
          timestamp_save: new Date(),
          status: interviewData.status || 'completed'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newInterview = await response.json();
      return {
        id: newInterview.id,
        patient_id: newInterview.patient_id,
        mood_rating: newInterview.mood_rating,
        energy_rating: newInterview.energy_rating,
        pain_rating: newInterview.pain_rating,
        timestamp_start: new Date(newInterview.timestamp_start),
        timestamp_save: new Date(newInterview.timestamp_save),
        status: newInterview.status
      };
    } catch (error) {
      console.error('Error saving simple interview:', error);
      // Return mock data for development
      return {
        id: Date.now(),
        patient_id: interviewData.patient_id,
        mood_rating: interviewData.mood_rating,
        energy_rating: interviewData.energy_rating,
        pain_rating: interviewData.pain_rating,
        timestamp_start: new Date(),
        timestamp_save: new Date(),
        status: interviewData.status || 'completed'
      };
    }
  },

  async getSchedule(): Promise<NotificationSchedule | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/schedule/get`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const schedule = await response.json();
      if (Object.keys(schedule).length === 0) {
        return null;
      } else {
        return {
          id: schedule.id,
          token_id: schedule.token_id,
          freq_minutes: schedule.freq_minutes,
          duration_days: schedule.duration_days,
          start_time_iso: schedule.start_time_iso,
          admin_timezone: schedule.admin_timezone,
          active: schedule.active,
        }
      }
    } catch (error) {
      console.log('Error fetching schedule:', error);
      return null
    }
  },

  async createSchedule(scheduleData: {
    expo_push_token: string,
    freq_minutes: number,
    duration_days: number,
    start_time_iso: Date,
    admin_timezone: string,
    active: boolean
  }): Promise<NotificationSchedule | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/schedule/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });
     
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const schedule = await response.json();
      return schedule;
      } catch (error) {
      console.log('Error fetching schedule:', error);
      return null;
    }
  },

  async cancelSchedule(): Promise<NotificationSchedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/schedule/cancel`, {
        method: 'POST',
      });
     
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const schedule = await response.json();
      return schedule;
      } catch (error) {
      console.log('Error cancelling schedule:', error);
      throw new Error('Failed to cancel schedule.');
    }
  }
};
