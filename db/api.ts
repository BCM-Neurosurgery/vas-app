import * as Crypto from 'expo-crypto';
import { interviewRepo } from "./repo/interviewRepo";
import { outboxRepo } from "./repo/outboxRepo";
import { patientRepo } from "./repo/patientRepo";
import { syncStateRepo } from "./repo/syncStateRepo";
import { initDb, withTransaction } from "./sqlite";
import { syncEngine } from "./sync/syncEngine";
import type { Patient, SimpleInterview } from "./types";
import { toUtcIso, utcIsoNow } from "./util/time";

export const API_BASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;

// helper device_id is strored in sync_state (craeted once)
async function getDeviceId(): Promise<string> {
  const key = "device_id"; // TODO: sus
  const existing = await syncStateRepo.get(key);
  if (existing) return existing;
  const fresh = Crypto.randomUUID();
  await syncStateRepo.set(key, fresh);
  return fresh;
}

function kickSync(patient_uuid?: string) {
  // fire-and-forget; do not block UI
  if (!patient_uuid) return;
  void syncEngine.syncNow(patient_uuid);
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
  // Call once at app startup (or first usage)
  async init(): Promise<void> {
    await initDb();
    // ensure device_id exists
    await getDeviceId();
  },

  // ===== PATIENT MANAGEMENT =====

  async getPatients(): Promise<Patient[]> {
    // local read
    return await patientRepo.list();
  },

  async createPatient(emuId: string): Promise<Patient> {
    const device_id = await getDeviceId();
    const now = utcIsoNow();

    const patient: Patient = {
      uuid: Crypto.randomUUID(),
      emu_id: emuId,
      latest: true,
      updated_at_utc: now,
      deleted_at_utc: null,
    };

    await withTransaction(async () => {
      // upsert patient locally
      await patientRepo.upsert(patient);

      // set latest locally (unsets others)
      await patientRepo.setLatest(patient.uuid);

      // enqueue UPSERT op
      await outboxRepo.enqueue({
        op_id: Crypto.randomUUID(),
        device_id,
        entity_type: "Patient",
        entity_uuid: patient.uuid,
        op_type: "UPSERT",
        scope_patient_uuid: patient.uuid,
        payload_json: JSON.stringify({
          uuid: patient.uuid,
          emu_id: patient.emu_id,
          latest: true,
          updated_at_utc: patient.updated_at_utc,
          deleted_at_utc: null,
        }),
        created_at_ms: Date.now(),
        attempts: 0,
        next_attempt_at_ms: 0,
        last_error: null,
        acked_at_ms: null,
      });
    })

    kickSync(patient.uuid);
    return patient;
  },

  async setAsLatest(patient: Patient): Promise<void> {
    const device_id = await getDeviceId();
    const now = utcIsoNow();

    // We need to update local flags for all patients and enqueue ops for all patients
    const all = await patientRepo.list();

    await withTransaction(async () => {
      // local update: set latest
      await patientRepo.setLatest(patient.uuid);

      // enqueue ops for all patients
      for (const p of all) {
        const isLatest = p.uuid == patient.uuid;
        await outboxRepo.enqueue({
          op_id: Crypto.randomUUID(),
          device_id,
          entity_type: "Patient",
          entity_uuid: p.uuid,
          op_type: "UPSERT",
          scope_patient_uuid: p.uuid, // patient-scoped feed; each patient uses its own uuid
          payload_json: JSON.stringify({
            uuid: p.uuid,
            emu_id: p.emu_id,
            latest: isLatest,
            updated_at_utc: now,
            deleted_at_utc: p.deleted_at_utc ?? null,
          }),
          created_at_ms: Date.now(),
          attempts: 0,
          next_attempt_at_ms: 0,
          last_error: null,
          acked_at_ms: null,
        });
      }
    });

    kickSync(patient.uuid);
  },

  // ===== SIMPLE INTERVIEW MANAGEMENT =====

  async getSimpleInterviews(patient: Patient): Promise<SimpleInterview[]> {
    // local read
    const interviews = await interviewRepo.listByPatient(patient.uuid);
    // background refresh
    kickSync(patient.uuid);
    return interviews;
  },

  async saveSimpleInterview(interviewData: {
    patient_uuid: string;
    mood_rating: number;
    energy_rating: number;
    pain_rating: number;
    task_name: string;
    timestamp_start: Date;
    status?: "completed" | "draft";
  }): Promise<SimpleInterview> {
    const device_id = await getDeviceId();
    const nowIso = utcIsoNow();

    const interview: SimpleInterview = {
      uuid: Crypto.randomUUID(),
      patient_uuid: interviewData.patient_uuid,
      mood_rating: interviewData.mood_rating,
      energy_rating: interviewData.energy_rating,
      pain_rating: interviewData.pain_rating,
      task_name: interviewData.task_name,
      timestamp_start: interviewData.timestamp_start,
      timestamp_save: new Date(),
      status: interviewData.status ?? "completed",
      updated_at_utc: nowIso,
      deleted_at_utc: null,
    };

    await withTransaction(async () => {
      await interviewRepo.upsert(interview);

      await outboxRepo.enqueue({
        op_id: Crypto.randomUUID(),
        device_id,
        entity_type: "SimpleInterview",
        entity_uuid: interview.uuid,
        op_type: "UPSERT",
        scope_patient_uuid: interview.patient_uuid,
        payload_json: JSON.stringify({
          uuid: interview.uuid,
          patient_uuid: interview.patient_uuid,
          mood_rating: interview.mood_rating,
          energy_rating: interview.energy_rating,
          pain_rating: interview.pain_rating,
          task_name: interview.task_name,
          timestamp_start: toUtcIso(interview.timestamp_start),
          timestamp_save: toUtcIso(interview.timestamp_save),
          status: interview.status,
          updated_at_utc: interview.updated_at_utc,
          deleted_at_utc: null,
        }),
        created_at_ms: Date.now(),
        attempts: 0,
        next_attempt_at_ms: 0,
        last_error: null,
        acked_at_ms: null,
      });
    });

    kickSync(interview.patient_uuid);
    return interview;
  },

// ===== Notifications: leave server-only for now (Phase 2) =====
  async getSchedule(): Promise<NotificationSchedule | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/schedule/get`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const schedule = await response.json();
      if (schedule === null) {
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
      throw error;
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
  },
}
// export const databaseAPI = {
//   // ===== PATIENT MANAGEMENT =====
  
//   // Fetch all patients from database
//   async getPatients(): Promise<Patient[]> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/patients`);
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       const patients = await response.json();
//       return patients.map((patient: any) => ({
//         id: patient.id,
//         emu_id: patient.emu_id,
//         latest: patient.latest
//       }));
//     } catch (error) {
//       console.error('Error fetching patients:', error);
//       throw error;
//     }
//   },

//   // Create new patient in database
//   async createPatient(emuId: string): Promise<Patient> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/patient-add`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           emu_id: emuId,
//           latest: true, // New patient becomes the latest
//         }),
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const newPatient = await response.json();
//       return {
//         id: newPatient.id,
//         emu_id: newPatient.emu_id,
//         latest: newPatient.latest
//       };
//     } catch (error) {
//       console.error('Error creating patient:', error);
//       throw error;
//     }
//   },

//   // Update patient in database
//   async updatePatients(patients: Patient[]): Promise<string> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/patient-update`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(patients),
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       return "patients updated successfully"
//     } catch (error) {
//       console.error('Error updating patient:', error);
//       throw error;
//     }
//   },

//   // Set a patient as the latest (and unset others)
//   async setAsLatest(patient: Patient): Promise<void> {
//     try {
//       // First, unset all patients as latest
//       let allPatients = await this.getPatients();
//       // set all their 'latest' fields to false except this patient
//       allPatients = allPatients.map(
//         obj => (
//           obj.id === patient.id ?
//           {...obj, latest: true} :
//           {...obj, latest: false}
//         ));

//       // now update patients
//       await this.updatePatients(allPatients);
//     } catch (error) {
//       console.error('Error setting patient as latest:', error);
//       throw error;
//     }
//   },

//   // ===== SIMPLE INTERVIEW MANAGEMENT =====

//   // Fetch simple interviews for a specific patient
//   async getSimpleInterviews(patient: Patient): Promise<SimpleInterview[]> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/simple-interviews/${patient.id}`);
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       const interviews = await response.json();
//       return interviews.map((interview: any) => ({
//         id: interview.id,
//         patient_id: interview.patient_id,
//         mood_rating: interview.mood_rating,
//         energy_rating: interview.energy_rating,
//         pain_rating: interview.pain_rating,
//         task_name: interview.task_name,
//         timestamp_start: new Date(interview.timestamp_start),
//         timestamp_save: new Date(interview.timestamp_save),
//         status: interview.status
//       }));
//     } catch (error) {
//       console.error('Error fetching simple interviews:', error);
//       throw error;
//     }
//   },

//   // Save a new simple interview (mood + energy rating)
//   async saveSimpleInterview(interviewData: {
//     patient_id: number;
//     mood_rating: number;
//     energy_rating: number;
//     pain_rating: number;
//     task_name: string;
//     timestamp_start: Date;
//     status?: 'completed' | 'draft';
//   }): Promise<SimpleInterview> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/simple-interviews`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           ...interviewData,
//           timestamp_save: new Date(),
//           status: interviewData.status || 'completed'
//         }),
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const newInterview = await response.json();
//       return {
//         id: newInterview.id,
//         patient_id: newInterview.patient_id,
//         mood_rating: newInterview.mood_rating,
//         energy_rating: newInterview.energy_rating,
//         pain_rating: newInterview.pain_rating,
//         task_name: newInterview.task_name,
//         timestamp_start: new Date(newInterview.timestamp_start),
//         timestamp_save: new Date(newInterview.timestamp_save),
//         status: newInterview.status
//       };
//     } catch (error) {
//       console.error('Error saving simple interview:', error);
//       throw error;
//     }
//   },

//   async getSchedule(): Promise<NotificationSchedule | null> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/admin/schedule/get`);
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       const schedule = await response.json();
//       if (schedule === null) {
//         return null;
//       } else {
//         return {
//           id: schedule.id,
//           token_id: schedule.token_id,
//           freq_minutes: schedule.freq_minutes,
//           duration_days: schedule.duration_days,
//           start_time_iso: schedule.start_time_iso,
//           admin_timezone: schedule.admin_timezone,
//           active: schedule.active,
//         }
//       }
//     } catch (error) {
//       console.log('Error fetching schedule:', error);
//       throw error;
//     }
//   },

//   async createSchedule(scheduleData: {
//     expo_push_token: string,
//     freq_minutes: number,
//     duration_days: number,
//     start_time_iso: Date,
//     admin_timezone: string,
//     active: boolean
//   }): Promise<NotificationSchedule | null> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/admin/schedule/create`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(scheduleData),
//       });
     
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const schedule = await response.json();
//       return schedule;
//       } catch (error) {
//       console.log('Error fetching schedule:', error);
//       return null;
//     }
//   },

//   async cancelSchedule(): Promise<NotificationSchedule> {
//     try {
//       const response = await fetch(`${API_BASE_URL}/admin/schedule/cancel`, {
//         method: 'POST',
//       });
     
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const schedule = await response.json();
//       return schedule;
//       } catch (error) {
//       console.log('Error cancelling schedule:', error);
//       throw new Error('Failed to cancel schedule.');
//     }
//   }
// };
