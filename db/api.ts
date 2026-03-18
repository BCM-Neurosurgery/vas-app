import * as Crypto from 'expo-crypto';
import { interviewRepo } from "./repo/interviewRepo";
import { outboxRepo } from "./repo/outboxRepo";
import { patientRepo } from "./repo/patientRepo";
import { syncStateRepo } from "./repo/syncStateRepo";
import { initDb, withTransaction } from "./sqlite";
import { bootstrapByEmu } from "./sync/syncClient";
import { syncEngine } from "./sync/syncEngine";
import { emitSyncNotice } from "./sync/syncNotice";
import type { Patient, SimpleInterview } from "./types";
import { fromIsoToDate, toUtcIso, utcIsoNow } from "./util/time";

export const API_BASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;

// helper device_id is strored in sync_state (craeted once)
async function getDeviceId(): Promise<string> {
  const key = "device_id";
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

function lastChangeKey(patient_uuid: string) {
  return `last_change_id:${patient_uuid}`;
}

function patientPayload(patient: Patient) {
  return {
    uuid: patient.uuid,
    emu_id: patient.emu_id,
    latest: patient.latest,
    updated_at_utc: patient.updated_at_utc,
    deleted_at_utc: patient.deleted_at_utc ?? null,
  };
}

function interviewPayload(interview: SimpleInterview) {
  return {
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
    deleted_at_utc: interview.deleted_at_utc ?? null,
  };
}

async function enqueueOutboxOp(args: {
  device_id: string;
  entity_type: "Patient" | "SimpleInterview";
  entity_uuid: string;
  op_type: "UPSERT" | "DELETE";
  scope_patient_uuid: string;
  payload: Record<string, unknown> | null;
}) {
  await outboxRepo.enqueue({
    op_id: Crypto.randomUUID(),
    device_id: args.device_id,
    entity_type: args.entity_type,
    entity_uuid: args.entity_uuid,
    op_type: args.op_type,
    scope_patient_uuid: args.scope_patient_uuid,
    payload_json: JSON.stringify(args.payload),
    created_at_ms: Date.now(),
    attempts: 0,
    next_attempt_at_ms: 0,
    last_error: null,
    acked_at_ms: null,
  });
}

async function hydratePatientFromServer(emuId: string): Promise<Patient | null> {
  try {
    const snapshot = await bootstrapByEmu(emuId);
    const patient: Patient = {
      uuid: snapshot.patient.uuid,
      emu_id: snapshot.patient.emu_id,
      latest: !!snapshot.patient.latest,
      updated_at_utc: snapshot.patient.updated_at_utc ?? utcIsoNow(),
      deleted_at_utc: snapshot.patient.deleted_at_utc ?? null,
    };

    const interviews: SimpleInterview[] = Array.isArray(snapshot.interviews)
      ? snapshot.interviews.map((interview: any) => ({
          uuid: interview.uuid,
          patient_uuid: interview.patient_uuid,
          mood_rating: interview.mood_rating,
          energy_rating: interview.energy_rating,
          pain_rating: interview.pain_rating,
          task_name: interview.task_name,
          timestamp_start: fromIsoToDate(interview.timestamp_start),
          timestamp_save: fromIsoToDate(interview.timestamp_save),
          status: interview.status,
          updated_at_utc: interview.updated_at_utc ?? utcIsoNow(),
          deleted_at_utc: interview.deleted_at_utc ?? null,
        }))
      : [];

    await withTransaction(async () => {
      await patientRepo.upsert(patient);
      for (const interview of interviews) {
        await interviewRepo.upsert(interview);
      }
      await syncStateRepo.set(lastChangeKey(patient.uuid), String(snapshot.latest_change_id ?? 0));
    });

    return patient;
  } catch (error: any) {
    if (String(error?.message ?? "").includes("404")) {
      return null;
    }
    emitSyncNotice("Server rehydration unavailable. Continuing with local-only patient creation.");
    return null;
  }
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
    const existingLocal = await patientRepo.getByEmuId(emuId);
    if (existingLocal) {
      if (!existingLocal.deleted_at_utc) {
        await this.setAsLatest(existingLocal);
        return (await patientRepo.getByUuid(existingLocal.uuid)) ?? existingLocal;
      }

      const device_id = await getDeviceId();
      const revivedPatient: Patient = {
        ...existingLocal,
        latest: true,
        updated_at_utc: utcIsoNow(),
        deleted_at_utc: null,
      };

      await withTransaction(async () => {
        await patientRepo.restore(revivedPatient.uuid, revivedPatient.updated_at_utc);
        await patientRepo.setLatest(revivedPatient.uuid);
        await enqueueOutboxOp({
          device_id,
          entity_type: "Patient",
          entity_uuid: revivedPatient.uuid,
          op_type: "UPSERT",
          scope_patient_uuid: revivedPatient.uuid,
          payload: patientPayload(revivedPatient),
        });
      });

      kickSync(revivedPatient.uuid);
      return (await patientRepo.getByUuid(revivedPatient.uuid)) ?? revivedPatient;
    }

    const hydratedPatient = await hydratePatientFromServer(emuId);
    if (hydratedPatient) {
      await this.setAsLatest(hydratedPatient);
      kickSync(hydratedPatient.uuid);
      return (await patientRepo.getByUuid(hydratedPatient.uuid)) ?? hydratedPatient;
    }

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
      await enqueueOutboxOp({
        device_id,
        entity_type: "Patient",
        entity_uuid: patient.uuid,
        op_type: "UPSERT",
        scope_patient_uuid: patient.uuid,
        payload: patientPayload(patient),
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
        await enqueueOutboxOp({
          device_id,
          entity_type: "Patient",
          entity_uuid: p.uuid,
          op_type: "UPSERT",
          scope_patient_uuid: p.uuid,
          payload: {
            uuid: p.uuid,
            emu_id: p.emu_id,
            latest: isLatest,
            updated_at_utc: now,
            deleted_at_utc: p.deleted_at_utc ?? null,
          },
        });
      }
    });

    kickSync(patient.uuid);
  },

  async deletePatient(patient: Patient): Promise<Patient | null> {
    const device_id = await getDeviceId();
    const deletedAt = utcIsoNow();
    const activePatients = await patientRepo.list();
    const interviews = await interviewRepo.listByPatient(patient.uuid);
    const remainingPatients = activePatients.filter((p) => p.uuid !== patient.uuid);
    const replacementLatest = patient.latest ? remainingPatients[0] ?? null : null;

    await withTransaction(async () => {
      await interviewRepo.softDeleteByPatient(patient.uuid, deletedAt);
      await patientRepo.softDelete(patient.uuid, deletedAt);

      if (replacementLatest) {
        await patientRepo.setLatest(replacementLatest.uuid);
      }

      for (const interview of interviews) {
        await enqueueOutboxOp({
          device_id,
          entity_type: "SimpleInterview",
          entity_uuid: interview.uuid,
          op_type: "DELETE",
          scope_patient_uuid: patient.uuid,
          payload: {
            uuid: interview.uuid,
            patient_uuid: patient.uuid,
            deleted_at_utc: deletedAt,
          },
        });
      }

      await enqueueOutboxOp({
        device_id,
        entity_type: "Patient",
        entity_uuid: patient.uuid,
        op_type: "DELETE",
        scope_patient_uuid: patient.uuid,
        payload: {
          uuid: patient.uuid,
          deleted_at_utc: deletedAt,
        },
      });

      if (replacementLatest) {
        const refreshedReplacement = await patientRepo.getByUuid(replacementLatest.uuid);
        if (refreshedReplacement) {
          await enqueueOutboxOp({
            device_id,
            entity_type: "Patient",
            entity_uuid: refreshedReplacement.uuid,
            op_type: "UPSERT",
            scope_patient_uuid: refreshedReplacement.uuid,
            payload: patientPayload(refreshedReplacement),
          });
        }
      }
    });

    kickSync(patient.uuid);
    if (replacementLatest) {
      kickSync(replacementLatest.uuid);
      return await patientRepo.getByUuid(replacementLatest.uuid);
    }
    return null;
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

      await enqueueOutboxOp({
        device_id,
        entity_type: "SimpleInterview",
        entity_uuid: interview.uuid,
        op_type: "UPSERT",
        scope_patient_uuid: interview.patient_uuid,
        payload: interviewPayload(interview),
      });
    });

    kickSync(interview.patient_uuid);
    return interview;
  },

  async deleteSimpleInterview(interview: SimpleInterview): Promise<void> {
    const device_id = await getDeviceId();
    const deletedAt = utcIsoNow();

    await withTransaction(async () => {
      await interviewRepo.softDelete(interview.uuid, deletedAt);
      await enqueueOutboxOp({
        device_id,
        entity_type: "SimpleInterview",
        entity_uuid: interview.uuid,
        op_type: "DELETE",
        scope_patient_uuid: interview.patient_uuid,
        payload: {
          uuid: interview.uuid,
          patient_uuid: interview.patient_uuid,
          deleted_at_utc: deletedAt,
        },
      });
    });

    kickSync(interview.patient_uuid);
  },

  async moveSimpleInterview(interview: SimpleInterview, target_patient_uuid: string): Promise<SimpleInterview> {
    if (interview.patient_uuid === target_patient_uuid) {
      return interview;
    }

    const device_id = await getDeviceId();
    const nowIso = utcIsoNow();
    const source_patient_uuid = interview.patient_uuid;
    const movedInterview: SimpleInterview = {
      ...interview,
      patient_uuid: target_patient_uuid,
      updated_at_utc: nowIso,
      deleted_at_utc: null,
    };

    await withTransaction(async () => {
      await interviewRepo.upsert(movedInterview);

      await enqueueOutboxOp({
        device_id,
        entity_type: "SimpleInterview",
        entity_uuid: interview.uuid,
        op_type: "DELETE",
        scope_patient_uuid: source_patient_uuid,
        payload: {
          uuid: interview.uuid,
          patient_uuid: source_patient_uuid,
          moved_to_patient_uuid: target_patient_uuid,
          updated_at_utc: nowIso,
        },
      });

      await enqueueOutboxOp({
        device_id,
        entity_type: "SimpleInterview",
        entity_uuid: movedInterview.uuid,
        op_type: "UPSERT",
        scope_patient_uuid: target_patient_uuid,
        payload: interviewPayload(movedInterview),
      });
    });

    kickSync(target_patient_uuid);
    return movedInterview;
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
